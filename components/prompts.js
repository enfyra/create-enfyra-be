const validators = require('./validators');

function getPrompts(availableManagers, projectNameArg) {
  const prompts = [
    // BASIC INFO - Always ask if not provided as argument
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: projectNameArg || 'my-enfyra-app',
      validate: validators.projectName,
      when: () => !projectNameArg // Only ask if not provided
    },
    
    // PACKAGE MANAGER
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: availableManagers,
      default: availableManagers.includes('yarn') ? 'yarn' : availableManagers[0]
    },
    
    // NODE NAME
    {
      type: 'input',
      name: 'nodeName',
      message: 'Node name (for clustering/identification):',
      default: answers => answers.projectName || projectNameArg,
      validate: validators.required
    },
    
    // DATABASE CONFIGURATION
    {
      type: 'list',
      name: 'dbType',
      message: 'Database type:',
      choices: [
        { name: 'MySQL', value: 'mysql' },
        { name: 'MariaDB', value: 'mariadb' },
        { name: 'PostgreSQL', value: 'postgres' }
      ],
      default: 'mysql'
    },
    {
      type: 'input',
      name: 'dbHost',
      message: 'Database host:',
      default: 'localhost',
      validate: validators.required
    },
    {
      type: 'input',
      name: 'dbPort',
      message: 'Database port:',
      default: answers => {
        switch(answers.dbType) {
          case 'postgres': return '5432';
          case 'mysql':
          case 'mariadb': return '3306';
          default: return '3306';
        }
      },
      validate: validators.port
    },
    {
      type: 'input',
      name: 'dbUsername',
      message: 'Database username:',
      default: 'root',
      validate: validators.required
    },
    {
      type: 'password',
      name: 'dbPassword',
      message: 'Database password (can be empty):',
      mask: '*'
    },
    {
      type: 'input',
      name: 'dbName',
      message: 'Database name:',
      default: 'enfyra',
      validate: validators.databaseName
    },
    
    // DATABASE POOL SETTINGS
    {
      type: 'confirm',
      name: 'configurePool',
      message: 'Configure database pool settings?',
      default: false
    },
    {
      type: 'input',
      name: 'dbPoolSize',
      message: 'Database pool size:',
      default: '100',
      when: answers => answers.configurePool,
      validate: validators.positiveNumber
    },
    {
      type: 'input',
      name: 'dbConnectionLimit',
      message: 'Connection limit:',
      default: '100',
      when: answers => answers.configurePool,
      validate: validators.positiveNumber
    },
    {
      type: 'input',
      name: 'dbAcquireTimeout',
      message: 'Acquire timeout (ms):',
      default: '60000',
      when: answers => answers.configurePool,
      validate: validators.nonNegativeNumber
    },
    {
      type: 'input',
      name: 'dbIdleTimeout',
      message: 'Idle timeout (ms):',
      default: '30000',
      when: answers => answers.configurePool,
      validate: validators.nonNegativeNumber
    },
    
    // REDIS CONFIGURATION
    {
      type: 'input',
      name: 'redisUri',
      message: 'Redis URI:',
      default: 'redis://localhost:6379',
      validate: validators.redisUri
    },
    {
      type: 'input',
      name: 'redisTTL',
      message: 'Default cache TTL (seconds):',
      default: '5',
      validate: validators.nonNegativeNumber
    },
    
    // APP SETTINGS
    {
      type: 'input',
      name: 'appPort',
      message: 'Application port:',
      default: '1105',
      validate: validators.port
    },
    {
      type: 'input',
      name: 'maxVmTimeout',
      message: 'Max VM execution timeout (ms):',
      default: '2000',
      validate: validators.timeout
    },
    
    // AUTH SETTINGS
    {
      type: 'input',
      name: 'secretKey',
      message: 'JWT Secret key (Enter to auto-generate):',
      default: () => require('crypto').randomBytes(32).toString('hex')
    },
    {
      type: 'input',
      name: 'saltRounds',
      message: 'Password salt rounds:',
      default: '10',
      validate: validators.saltRounds
    },
    {
      type: 'input',
      name: 'accessTokenExp',
      message: 'Access token expiry (e.g., 15m, 1h, 1d):',
      default: '15m',
      validate: validators.tokenExpiry
    },
    {
      type: 'input',
      name: 'refreshTokenNoRemember',
      message: 'Refresh token expiry (no remember):',
      default: '1d',
      validate: validators.tokenExpiry
    },
    {
      type: 'input',
      name: 'refreshTokenRemember',
      message: 'Refresh token expiry (remember me):',
      default: '7d',
      validate: validators.tokenExpiry
    },
    
    // ENVIRONMENT
    {
      type: 'list',
      name: 'nodeEnv',
      message: 'Default environment:',
      choices: ['development', 'production', 'test'],
      default: 'development'
    },
    
    // GIT REPOSITORY
    {
      type: 'input',
      name: 'gitRepo',
      message: 'Enfyra backend Git repository URL:',
      default: 'https://github.com/dothinh115/enfyra_be.git',
      validate: validators.gitRepo
    }
  ];

  return prompts;
}

function getConfirmationPrompt() {
  return {
    type: 'confirm',
    name: 'confirm',
    message: 'Create project with this configuration?',
    default: true
  };
}

module.exports = {
  getPrompts,
  getConfirmationPrompt
};