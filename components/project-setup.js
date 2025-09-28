const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const { downloadTemplate } = require('giget');
const { generateEnvFile } = require('./env-builder');
const { checkDiskSpaceAvailable } = require('./disk-space-checker');

// Check available package managers with version validation
function detectPackageManagers() {
  const managers = [];
  
  // Check npm (minimum version 8.0.0)
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
  
  // Check yarn (minimum version 1.22.0)
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
  
  // Check pnpm (minimum version 6.0.0)
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

  // Check bun (minimum version 1.0.0)
  try {
    // Try to detect bun with full path first
    let bunVersion;
    const bunPath = path.join(process.env.HOME || '', '.bun', 'bin', 'bun');

    // Try using full path if exists
    if (fs.existsSync(bunPath)) {
      bunVersion = execSync(`${bunPath} --version`, {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      }).trim();
    } else {
      // Fallback to regular command
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

// Check Node.js version (minimum 20.0.0)
function checkNodeVersion() {
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0]);
  if (major < 20) {
    console.log(chalk.red(`❌ Node.js version ${nodeVersion} is not supported.`));
    console.log(chalk.yellow('Please upgrade to Node.js 20.0.0 or higher.'));
    process.exit(1);
  }
}

// Create project from configuration
async function createProject(config) {
  const projectPath = path.join(process.cwd(), config.projectName);
  const spinner = ora();
  
  try {
    // Check disk space before proceeding
    spinner.start(chalk.blue('Checking available disk space...'));
    const spaceCheck = await checkDiskSpaceAvailable(process.cwd());
    spinner.succeed(chalk.green(
      `Disk space check passed (${spaceCheck.freeGB}GB available of ${(spaceCheck.total / 1024 / 1024 / 1024).toFixed(2)}GB total)`
    ));
    console.log(chalk.dim(`Required: ${spaceCheck.requiredGB}GB`));

    // Create project directory
    spinner.start(chalk.blue('Creating project directory...'));
    await fs.ensureDir(projectPath);
    spinner.succeed(chalk.green('Project directory created'));

    // Download backend template using giget
    spinner.start(chalk.blue('Downloading backend template...'));
    await downloadTemplate('github:enfyra/backend', {
      dir: projectPath,
      force: true,
      provider: 'github'
    });
    spinner.succeed(chalk.green('Template downloaded successfully'));


    // Update package.json
    spinner.start(chalk.blue('Updating package.json...'));
    await updatePackageJson(projectPath, config);
    spinner.succeed(chalk.green('Package.json updated'));

    // Update init.json with admin credentials
    spinner.start(chalk.blue('Configuring admin account...'));
    await updateInitJson(projectPath, config);
    spinner.succeed(chalk.green('Admin account configured'));

    // Generate environment file
    spinner.start(chalk.blue('Generating environment file...'));
    await generateEnvFile(projectPath, config);
    spinner.succeed(chalk.green('Environment file created'));

    // Install dependencies
    spinner.start(chalk.blue(`Installing dependencies with ${config.packageManager}...`));
    try {
      await installDependencies(projectPath, config);
      spinner.succeed(chalk.green('Dependencies installed successfully'));
    } catch (error) {
      spinner.fail(chalk.red('Dependencies installation failed'));

      // Package manager specific error handling
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
        `  ${chalk.cyan('npx @enfyra/create-enfyra-be')}\n` +
        `  ${chalk.gray(`Then select one of: ${otherManagers.join(', ')}`)}\n\n` +
        `${chalk.red('Error details:')} ${error.message}\n`
      );
    }


  } catch (error) {
    spinner.fail(chalk.red('Setup failed'));

    // Always cleanup on any failure
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
  
  // Update project name
  packageJson.name = config.projectName;
  
  // Update version
  packageJson.version = '0.1.0';
  
  // Clear repository info
  delete packageJson.repository;
  delete packageJson.bugs;
  delete packageJson.homepage;
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

async function updateInitJson(projectPath, config) {
  // Try both possible locations for init.json
  const initJsonPaths = [
    path.join(projectPath, 'src/core/bootstrap/data/init.json'),
    path.join(projectPath, 'dist/core/bootstrap/data/init.json')
  ];
  
  for (const initJsonPath of initJsonPaths) {
    if (fs.existsSync(initJsonPath)) {
      const initJson = await fs.readJson(initJsonPath);
      
      // Update admin credentials
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

    // For Bun, use full path if available
    let commandPath = config.packageManager;
    if (config.packageManager === 'bun') {
      const bunPath = path.join(process.env.HOME || '', '.bun', 'bin', 'bun');
      if (fs.existsSync(bunPath)) {
        commandPath = bunPath;
      }
    }

    // Add environment variables for better network handling
    const env = { ...process.env };
    if (config.packageManager === 'bun') {
      // Disable IPv6 for Bun if having connection issues
      env.NODE_OPTIONS = '--dns-result-order=ipv4first';
      // Increase timeout for slow connections
      env.BUN_CONFIG_TIMEOUT = '60000';
    }

    const install = spawn(commandPath, args, {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true,  // Add shell: true to fix spawn ENOENT on Windows
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
        // Log more detailed error information
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