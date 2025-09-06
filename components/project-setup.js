const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const { generateEnvContent } = require('./env-builder');

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
  
  // Test spinner first - then customize
  const spinner = ora('Creating a new Enfyra application...').start();
  
  try {
    // Create directory
    fs.mkdirSync(projectPath);
    
    // Clone repository
    spinner.text = 'Cloning repository...';
    const gitRepo = 'https://github.com/dothinh115/enfyra_be.git';
    try {
      execSync(`git clone --depth 1 ${gitRepo} .`, {
        cwd: projectPath,
        stdio: 'ignore'
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${gitRepo}`);
    }
    
    // Remove .git folder for fresh start
    fs.removeSync(path.join(projectPath, '.git'));
    
    // Create .env file
    spinner.text = 'Configuring environment...';
    const envContent = generateEnvContent(config);
    fs.writeFileSync(path.join(projectPath, '.env'), envContent);
    
    // Update package.json name if exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);
      packageJson.name = config.projectName;
      fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    }
    
    // Install dependencies
    spinner.text = `Installing dependencies with ${config.packageManager}...`;
    
    const installCmd = {
      npm: 'npm install',
      yarn: 'yarn',
      bun: 'bun install'
    }[config.packageManager];
    
    try {
      execSync(installCmd, {
        cwd: projectPath,
        stdio: 'ignore'
      });
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Warning: Failed to install dependencies automatically'));
      console.log(chalk.yellow(`Please run "${installCmd}" manually after setup`));
    }
    
    spinner.succeed(chalk.green('Project created successfully!'));
    
    // Minimal success message
    console.log(chalk.green('\n✨ Done! Your project is ready.\n'));
    
    const commands = {
      npm: 'npm run start:dev',
      yarn: 'yarn start:dev',
      bun: 'bun run start:dev'
    }[config.packageManager];
    
    console.log(chalk.cyan(`  cd ${config.projectName}`));
    console.log(chalk.cyan(`  ${commands}`));
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    
    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      fs.removeSync(projectPath);
    }
    
    console.error(chalk.red(`\nError: ${error.message}`));
    console.log(chalk.yellow('\nPossible issues:'));
    console.log('  • Check internet connection');
    console.log('  • Verify Git repository URL');
    console.log('  • Ensure Git is installed');
    
    throw error;
  }
}

module.exports = {
  detectPackageManagers,
  checkNodeVersion,
  createProject
};