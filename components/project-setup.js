const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const { downloadTemplate } = require('giget');
const { generateEnvFile } = require('./env-builder');

function detectPackageManagers() {
  const managers = [];

  try {
    const npmVersion = execSync('npm --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true
    }).trim();
    const majorVersion = parseInt(npmVersion.split('.')[0]);
    if (majorVersion >= 8) {
      managers.push({ name: 'npm', value: 'npm', version: npmVersion });
    }
  } catch {}

  try {
    const yarnVersion = execSync('yarn --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true
    }).trim();
    const [major, minor] = yarnVersion.split('.').map(Number);
    if (major > 1 || (major === 1 && minor >= 22)) {
      managers.push({ name: 'yarn', value: 'yarn', version: yarnVersion });
    }
  } catch {}

  try {
    const pnpmVersion = execSync('pnpm --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true
    }).trim();
    const majorVersion = parseInt(pnpmVersion.split('.')[0]);
    if (majorVersion >= 6) {
      managers.push({ name: 'pnpm', value: 'pnpm', version: pnpmVersion });
    }
  } catch {}

  try {
    let bunVersion;
    const bunPath = path.join(process.env.HOME || '', '.bun', 'bin', 'bun');

    if (fs.existsSync(bunPath)) {
      bunVersion = execSync(`${bunPath} --version`, {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      }).trim();
    } else {
      bunVersion = execSync('bun --version', {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      }).trim();
    }

    const majorVersion = parseInt(bunVersion.split('.')[0]);
    if (majorVersion >= 1) {
      managers.push({ name: 'bun', value: 'bun', version: bunVersion, path: bunPath });
    }
  } catch {}

  return managers;
}

function checkNodeVersion() {
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0]);
  if (major < 20) {
    console.log(chalk.red(`❌ Node.js version ${nodeVersion} is not supported.`));
    console.log(chalk.yellow('Please upgrade to Node.js 20.0.0 or higher.'));
    process.exit(1);
  }
}

async function createProject(config) {
  const projectPath = path.join(process.cwd(), config.projectName);
  const spinner = ora();

  try {
    spinner.start(chalk.blue('Creating project directory...'));
    await fs.ensureDir(projectPath);
    spinner.succeed(chalk.green('Project directory created'));

    spinner.start(chalk.blue('Downloading server template...'));
    await downloadTemplate('github:enfyra/server', {
      dir: projectPath,
      force: true,
      provider: 'github'
    });
    spinner.succeed(chalk.green('Template downloaded successfully'));

    const githubFolderPath = path.join(projectPath, '.github');
    if (fs.existsSync(githubFolderPath)) {
      spinner.start(chalk.blue('Removing .github folder...'));
      await fs.remove(githubFolderPath);
      spinner.succeed(chalk.green('.github folder removed'));
    }

    spinner.start(chalk.blue('Updating package.json...'));
    await updatePackageJson(projectPath, config);
    spinner.succeed(chalk.green('Package.json updated'));

    spinner.start(chalk.blue('Configuring admin account...'));
    await updateInitJson(projectPath, config);
    spinner.succeed(chalk.green('Admin account configured'));

    spinner.start(chalk.blue('Generating environment file...'));
    await generateEnvFile(projectPath, config);
    spinner.succeed(chalk.green('Environment file created'));

    spinner.start(chalk.blue(`Installing dependencies with ${config.packageManager}...`));
    try {
      await installDependencies(projectPath, config);
      spinner.succeed(chalk.green('Dependencies installed successfully'));
    } catch (error) {
      spinner.fail(chalk.red('Dependencies installation failed'));

      const packageManagerIssues = {
        bun: 'https://github.com/oven-sh/bun/issues',
        pnpm: 'https://github.com/pnpm/pnpm/issues',
        yarn: 'https://github.com/yarnpkg/yarn/issues',
        npm: 'https://github.com/npm/cli/issues'
      };

      const issueUrl = packageManagerIssues[config.packageManager];
      const otherManagers = Object.keys(packageManagerIssues).filter(pm => pm !== config.packageManager);

      throw new Error(
        `\n\n${chalk.red(`⚠️  ${config.packageManager} is experiencing issues.`)}\n\n` +
        `${chalk.yellow('Please report this issue at:')} ${chalk.cyan(issueUrl)}\n\n` +
        `${chalk.green('Alternative: Please try using a different package manager:')}\n` +
        `  ${chalk.cyan('npx @enfyra/create-server')}\n` +
        `  ${chalk.gray(`Then select one of: ${otherManagers.join(', ')}`)}\n\n` +
        `${chalk.red('Error details:')} ${error.message}\n`
      );
    }

  } catch (error) {
    spinner.fail(chalk.red('Setup failed'));

    if (fs.existsSync(projectPath)) {
      spinner.start(chalk.yellow('Cleaning up project directory...'));
      try {
        await fs.remove(projectPath);
        spinner.succeed(chalk.yellow('Project directory cleaned up'));
      } catch (cleanupError) {
        spinner.warn(chalk.yellow(`Could not clean up directory: ${projectPath}`));
        console.log(chalk.gray('Please manually delete this directory before trying again.'));
      }
    }

    throw error;
  }
}



async function updatePackageJson(projectPath, config) {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found in template');
  }

  const packageJson = await fs.readJson(packageJsonPath);

  packageJson.name = config.projectName;

  packageJson.version = '0.1.0';

  delete packageJson.repository;
  delete packageJson.bugs;
  delete packageJson.homepage;

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

async function updateInitJson(projectPath, config) {
  const initJsonPaths = [
    path.join(projectPath, 'src/core/bootstrap/data/init.json'),
    path.join(projectPath, 'dist/core/bootstrap/data/init.json')
  ];

  for (const initJsonPath of initJsonPaths) {
    if (fs.existsSync(initJsonPath)) {
      const initJson = await fs.readJson(initJsonPath);

      if (initJson.user_definition) {
        initJson.user_definition.email = config.adminEmail;
        initJson.user_definition.password = config.adminPassword;
      }

      await fs.writeJson(initJsonPath, initJson, { spaces: 2 });
    }
  }
}

async function installDependencies(projectPath, config) {
  return new Promise((resolve, reject) => {
    const commands = {
      npm: ['install', '--legacy-peer-deps'],
      yarn: ['install'],
      pnpm: ['install'],
      bun: ['install']
    };

    const args = commands[config.packageManager] || commands.npm;

    let commandPath = config.packageManager;
    if (config.packageManager === 'bun') {
      const bunPath = path.join(process.env.HOME || '', '.bun', 'bin', 'bun');
      if (fs.existsSync(bunPath)) {
        commandPath = bunPath;
      }
    }

    const env = { ...process.env };
    if (config.packageManager === 'bun') {
      env.NODE_OPTIONS = '--dns-result-order=ipv4first';
      env.BUN_CONFIG_TIMEOUT = '60000';
    }

    const install = spawn(commandPath, args, {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true,
      env
    });

    let stdout = '';
    let stderr = '';

    install.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    install.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    install.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorMsg = stderr || stdout || 'Unknown error';

        reject(new Error(`${errorMsg}`));
      }
    });

    install.on('error', (error) => {
      reject(new Error(`Package manager spawn error: ${error.message}. Make sure ${config.packageManager} is installed and in PATH`));
    });
  });
}


module.exports = {
  detectPackageManagers,
  checkNodeVersion,
  createProject
};