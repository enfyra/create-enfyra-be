const fs = require('fs-extra');
const path = require('path');
const { spawn, execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const { downloadTemplate } = require('giget');
const { generateEnvFile } = require('./env-builder');

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
  
  // Check bun (minimum version 1.0.0)
  try {
    const bunVersion = execSync('bun --version', {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true
    }).trim();
    const majorVersion = parseInt(bunVersion.split('.')[0]);
    if (majorVersion >= 1) {
      managers.push({ name: 'bun', value: 'bun', version: bunVersion });
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
    // Create project directory
    spinner.start(chalk.blue('Creating project directory...'));
    await fs.ensureDir(projectPath);
    spinner.succeed(chalk.green('Project directory created'));

    // Download backend template using giget
    spinner.start(chalk.blue('Downloading backend template...'));
    await downloadTemplate('github:dothinh115/enfyra-be', {
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
    await installDependencies(projectPath, config);
    spinner.succeed(chalk.green('Dependencies installed successfully'));


  } catch (error) {
    spinner.fail(chalk.red('Setup failed'));
    
    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      await fs.remove(projectPath);
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
      npm: ['install'],
      yarn: ['install'],
      bun: ['install']
    };

    const args = commands[config.packageManager] || commands.npm;

    const install = spawn(config.packageManager, args, {
      cwd: projectPath,
      stdio: 'pipe',
      shell: true  // Add shell: true to fix spawn ENOENT on Windows
    });

    let stderr = '';

    install.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    install.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Package installation failed: ${stderr}`));
      }
    });

    install.on('error', (error) => {
      reject(new Error(`Package manager error: ${error.message}`));
    });
  });
}


module.exports = {
  detectPackageManagers,
  checkNodeVersion,
  createProject
};