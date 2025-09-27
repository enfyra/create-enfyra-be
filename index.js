#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const { program } = require('commander');

const { detectPackageManagers, checkNodeVersion, createProject } = require('./components/project-setup');
const { getPrompts, getConfirmationPrompt } = require('./components/prompts');
const { validateAllConnections } = require('./components/connection-validator');

async function main() {
  // Parse command line arguments
  program
    .name('create-enfyra-be')
    .description('Create a new Enfyra backend application')
    .argument('[project-name]', 'Name of your project')
    .option('--skip-prompts', 'Skip interactive prompts and use defaults')
    .parse();

  console.log(chalk.cyan.bold('\n╔════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║   🚀 Create Enfyra Backend    ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════╝\n'));
  
  // Check Node version
  checkNodeVersion();

  // Check available package managers
  const availableManagers = detectPackageManagers();
  if (availableManagers.length === 0) {
    console.log(chalk.red('❌ No compatible package manager found!'));
    console.log(chalk.yellow('Please install one of the following:'));
    console.log(chalk.yellow('  • npm >= 8.0.0'));
    console.log(chalk.yellow('  • yarn >= 1.22.0'));
    console.log(chalk.yellow('  • bun >= 1.0.0'));
    process.exit(1);
  }

  // Show detected package managers with versions
  console.log(chalk.gray('Detected package managers:'));
  availableManagers.forEach(pm => {
    console.log(chalk.gray(`  • ${pm.name} v${pm.version}`));
  });
  console.log('');

  // Get project name from arguments or prompt
  const projectNameArg = program.args[0];
  
  // Get configuration from user
  const config = await inquirer.prompt(getPrompts(availableManagers, projectNameArg));
  
  // Add project name if provided as argument
  if (projectNameArg) {
    // Validate project name argument
    const validation = require('./components/validators').projectName(projectNameArg);
    if (validation !== true) {
      console.log(chalk.red(`❌ ${validation}`));
      process.exit(1);
    }
    config.projectName = projectNameArg;
  }

  // Validate connections with retry option
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
      
      // Re-prompt for connection details
      console.log(chalk.cyan('\n🔄 Please re-enter your connection details:\n'));
      
      const connectionPrompts = getPrompts(availableManagers, projectNameArg).filter(prompt => 
        ['dbType', 'dbHost', 'dbPort', 'dbUsername', 'dbPassword', 'dbName', 'redisUri'].includes(prompt.name) ||
        (prompt.when && ['configurePool', 'dbPoolSize', 'dbConnectionLimit', 'dbAcquireTimeout', 'dbIdleTimeout'].includes(prompt.name))
      );
      
      const newConnectionConfig = await inquirer.prompt(connectionPrompts);
      
      // Update config with new connection details
      Object.assign(config, newConnectionConfig);
    }
  }

  // Simple confirmation without excessive output
  const { confirm } = await inquirer.prompt([getConfirmationPrompt()]);

  if (!confirm) {
    console.log(chalk.red('\n❌ Installation cancelled'));
    process.exit(0);
  }

  // Create the project
  try {
    await createProject(config);
    
    // Success message
    console.log(chalk.green('\n✨ Done! Your Enfyra backend is ready.\n'));
    
    const commands = {
      npm: 'npm run start',
      yarn: 'yarn start',
      bun: 'bun run start'
    }[config.packageManager];
    
    console.log(chalk.cyan(`  cd ${config.projectName}`));
    console.log(chalk.cyan(`  ${commands}`));
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Setup failed: ${error.message}`));
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red(`\n❌ Unexpected error: ${error.message}`));
  process.exit(1);
});

// Run
main().catch(error => {
  console.error(chalk.red(`\n❌ Error: ${error.message}`));
  process.exit(1);
});