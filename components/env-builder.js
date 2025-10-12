const fs = require('fs-extra');
const path = require('path');

async function generateEnvFile(projectPath, config) {
  const envContent = generateEnvContent(config);
  const envPath = path.join(projectPath, '.env');
  
  await fs.writeFile(envPath, envContent);
}

function generateEnvContent(config) {
  let dbSection = '';
  
  if (config.dbType === 'mongodb') {
    // Generate MongoDB URI
    const mongoUri = `mongodb://${config.dbUsername}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}?authSource=${config.mongoAuthSource}`;
    dbSection = `#DB SETTING
DB_TYPE=mongodb
MONGO_URI=${mongoUri}`;
  } else {
    // Generate SQL database settings
    dbSection = `#DB SETTING
DB_TYPE=${config.dbType}
DB_HOST=${config.dbHost}
DB_PORT=${config.dbPort}
DB_USERNAME=${config.dbUsername}
DB_PASSWORD=${config.dbPassword}
DB_NAME=${config.dbName}

#DATABASE CONNECTION POOL SETTINGS
DB_POOL_SIZE=${config.dbPoolSize || '100'}
DB_CONNECTION_LIMIT=${config.dbConnectionLimit || '100'}
DB_ACQUIRE_TIMEOUT=${config.dbAcquireTimeout || '60000'}
DB_IDLE_TIMEOUT=${config.dbIdleTimeout || '30000'}`;
  }

  return `${dbSection}

#REDIS SETTING
REDIS_URI=${config.redisUri}
DEFAULT_TTL=5

#APP SETTING
NODE_NAME=${config.projectName}
PORT=${config.appPort}
DEFAULT_HANDLER_TIMEOUT=5000
DEFAULT_PREHOOK_TIMEOUT=3000
DEFAULT_AFTERHOOK_TIMEOUT=3000
PACKAGE_MANAGER=${config.packageManager}

#AUTH_SETTING
SECRET_KEY=${require('crypto').randomBytes(32).toString('hex')}
SALT_ROUNDS=10
ACCESS_TOKEN_EXP=15m
REFRESH_TOKEN_NO_REMEMBER_EXP=1d
REFRESH_TOKEN_REMEMBER_EXP=7d`;
}

module.exports = {
  generateEnvFile,
  generateEnvContent
};
