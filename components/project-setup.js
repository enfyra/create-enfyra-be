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
    const npmVersion = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    const majorVersion = parseInt(npmVersion.split('.')[0]);
    if (majorVersion >= 8) {
      managers.push({ name: 'npm', value: 'npm', version: npmVersion });
    }
  } catch {}
  
  // Check yarn (minimum version 1.22.0)
  try {
    const yarnVersion = execSync('yarn --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    const [major, minor] = yarnVersion.split('.').map(Number);
    if (major > 1 || (major === 1 && minor >= 22)) {
      managers.push({ name: 'yarn', value: 'yarn', version: yarnVersion });
    }
  } catch {}
  
  // Check bun (minimum version 1.0.0)
  try {
    const bunVersion = execSync('bun --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
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
    await downloadTemplate('github:dothinh115/enfyra_be', {
      dir: projectPath,
      force: true,
      provider: 'github'
    });
    spinner.succeed(chalk.green('Template downloaded successfully'));

    // Clean up git history
    spinner.start(chalk.blue('Cleaning up git history...'));
    await cleanupGitHistory(projectPath);
    spinner.succeed(chalk.green('Git history cleaned'));

    // Update package.json
    spinner.start(chalk.blue('Updating package.json...'));
    await updatePackageJson(projectPath, config);
    spinner.succeed(chalk.green('Package.json updated'));

    // Generate environment file
    spinner.start(chalk.blue('Generating environment file...'));
    await generateEnvFile(projectPath, config);
    spinner.succeed(chalk.green('Environment file created'));

    // Install dependencies
    spinner.start(chalk.blue(`Installing dependencies with ${config.packageManager}...`));
    await installDependencies(projectPath, config);
    spinner.succeed(chalk.green('Dependencies installed successfully'));

    // Initialize git repository
    spinner.start(chalk.blue('Initializing git repository...'));
    await initializeGit(projectPath);
    spinner.succeed(chalk.green('Git repository initialized'));

  } catch (error) {
    spinner.fail(chalk.red('Setup failed'));
    
    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      await fs.remove(projectPath);
    }
    
    throw error;
  }
}


async function cleanupGitHistory(projectPath) {
  const gitDir = path.join(projectPath, '.git');
  if (fs.existsSync(gitDir)) {
    await fs.remove(gitDir);
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
      stdio: 'pipe'
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

async function initializeGit(projectPath) {
  return new Promise((resolve) => {
    const gitInit = spawn('git', ['init'], {
      cwd: projectPath,
      stdio: 'pipe'
    });
    
    gitInit.on('close', (code) => {
      if (code === 0) {
        // Add initial commit
        const gitAdd = spawn('git', ['add', '.'], {
          cwd: projectPath,
          stdio: 'pipe'
        });
        
        gitAdd.on('close', (addCode) => {
          if (addCode === 0) {
            const gitCommit = spawn('git', ['commit', '-m', 'Initial commit from create-enfyra-be'], {
              cwd: projectPath,
              stdio: 'pipe'
            });
            
            gitCommit.on('close', (commitCode) => {
              if (commitCode === 0) {
                resolve();
              } else {
                resolve(); // Don't fail the whole process for git commit issues
              }
            });
          } else {
            resolve(); // Don't fail for git add issues
          }
        });
      } else {
        resolve(); // Don't fail for git init issues
      }
    });
    
    gitInit.on('error', () => {
      resolve(); // Don't fail if git is not available
    });
  });
}

module.exports = {
  detectPackageManagers,
  checkNodeVersion,
  createProject
};