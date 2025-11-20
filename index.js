#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const { program } = require('commander');

const { detectPackageManagers, checkNodeVersion, createProject } = require('./components/project-setup');
const { getPrompts, getConfirmationPrompt } = require('./components/prompts');
const { validateAllConnections } = require('./components/connection-validator');

async function main() {
  program
    .name('create-server')
    .description('Create a new Enfyra server application')
    .argument('[project-name]', 'Name of your project')
    .option('--skip-prompts', 'Skip interactive prompts and use defaults')
    .parse();

  console.log(chalk.cyan.bold('\n╔════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║   🚀 Create Enfyra Server     ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════╝\n'));

  checkNodeVersion();

  const availableManagers = detectPackageManagers();
  if (availableManagers.length === 0) {
    console.log(chalk.red('❌ No compatible package manager found!'));
    console.log(chalk.yellow('Please install one of the following:'));
    console.log(chalk.yellow('  • npm >= 8.0.0'));
    console.log(chalk.yellow('  • yarn >= 1.22.0'));
    console.log(chalk.yellow('  • pnpm >= 6.0.0'));
    console.log(chalk.yellow('  • bun >= 1.0.0'));
    process.exit(1);
  }

  console.log(chalk.gray('Detected package managers:'));
  availableManagers.forEach(pm => {
    console.log(chalk.gray(`  • ${pm.name} v${pm.version}`));
  });
  console.log('');

  let projectNameArg = program.args[0];

  if (projectNameArg) {
    const validation = require('./components/validators').projectName(projectNameArg);
    if (validation !== true) {
      console.log(chalk.red(`❌ Invalid project name: ${validation}`));
      console.log(chalk.yellow('Please enter a valid project name.\n'));
      projectNameArg = null;
    }
  }

  const config = await inquirer.prompt(getPrompts(availableManagers, projectNameArg));

  if (projectNameArg && !config.projectName) {
    config.projectName = projectNameArg;
  }

  let connectionsValid = false;
  while (!connectionsValid) {
    connectionsValid = await validateAllConnections(config);

    if (!connectionsValid) {
      const { retry } = await inquirer.prompt([
        {
          type: 'list',
          name: 'retry',
          message: 'What would you like to do?',
          choices: [
            { name: 'Re-enter connection details', value: 'retry' },
            { name: 'Exit setup', value: 'exit' }
          ]
        }
      ]);

      if (retry === 'exit') {
        console.log(chalk.yellow('\n👋 Setup cancelled. Fix your connections and try again later.'));
        process.exit(0);
      }

      console.log(chalk.cyan('\n🔄 Please re-enter your connection details:\n'));

      const connectionPrompts = getPrompts(availableManagers, projectNameArg).filter(prompt =>
        ['dbType', 'dbHost', 'dbPort', 'dbUsername', 'dbPassword', 'dbName', 'mongoAuthSource', 'redisUri'].includes(prompt.name) ||
        (prompt.when && ['configurePool', 'dbPoolSize', 'dbConnectionLimit', 'dbAcquireTimeout', 'dbIdleTimeout'].includes(prompt.name))
      );

      const newConnectionConfig = await inquirer.prompt(connectionPrompts);

      Object.assign(config, newConnectionConfig);
    }
  }

  const { confirm } = await inquirer.prompt([getConfirmationPrompt()]);

  if (!confirm) {
    console.log(chalk.red('\n❌ Installation cancelled'));
    process.exit(0);
  }

  try {
    await createProject(config);

    console.log(chalk.green('\n✨ Done! Your Enfyra server is ready.\n'));

    const commands = {
      npm: 'npm run start',
      yarn: 'yarn start',
      bun: 'bun run start'
    }[config.packageManager];

    console.log(chalk.cyan(`  cd ${config.projectName}`));
    console.log(chalk.cyan(`  ${commands}`));

  } catch (error) {
    console.error(chalk.red(`\n❌ Setup failed: ${error.message}`));
    console.log(chalk.yellow('\n💡 You can try again with the same command.'));
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error(chalk.red(`\n❌ Unexpected error: ${error.message}`));
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red(`\n❌ Error: ${error.message}`));
  process.exit(1);
});