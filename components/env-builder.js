const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

async function generateEnvFile(projectPath, config) {
  const envContent = generateEnvContent(config);
  const envPath = path.join(projectPath, '.env');
  
  await fs.writeFile(envPath, envContent);
}

function generateEnvContent(config) {
  const redisTtl = '5';
  const handlerTimeout = config.configureHandlerTimeouts ? config.handlerTimeout : '20000';
  const prehookTimeout = config.configureHandlerTimeouts ? config.prehookTimeout : '20000';
  const afterhookTimeout = config.configureHandlerTimeouts ? config.afterhookTimeout : '20000';
  const secretKey = crypto.randomBytes(32).toString('hex');
  const saltRounds = '10';
  const accessTokenExp = '15m';
  const refreshTokenNoRememberExp = '1d';
  const refreshTokenRememberExp = '7d';
  const backendUrl =
    config.backendUrl || `http://localhost:${config.appPort || '1105'}`;
  const nodeEnv = config.nodeEnv || 'development';
  
  let dbSection = '';
  let poolSection = '';

  if (config.dbType === 'mongodb') {
    const mongoUri = `mongodb://${config.dbUsername}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}?authSource=${config.mongoAuthSource}`;
    dbSection = `DB_TYPE=mongodb
MONGO_URI=${mongoUri}`;
  } else {
    dbSection = `DB_TYPE=${config.dbType}
DB_HOST=${config.dbHost}
DB_PORT=${config.dbPort}
DB_USERNAME=${config.dbUsername}
DB_PASSWORD=${config.dbPassword}
DB_NAME=${config.dbName}`;

    if (config.configurePool) {
      poolSection = `
DB_POOL_SIZE=${config.dbPoolSize}
DB_CONNECTION_LIMIT=${config.dbConnectionLimit}
DB_ACQUIRE_TIMEOUT=${config.dbAcquireTimeout}
DB_IDLE_TIMEOUT=${config.dbIdleTimeout}`;
    } else {
      poolSection = `
DB_POOL_SIZE=100
DB_CONNECTION_LIMIT=100
DB_ACQUIRE_TIMEOUT=60000
DB_IDLE_TIMEOUT=30000`;
    }
  }

  return `${dbSection}${poolSection}
REDIS_URI=${config.redisUri}
DEFAULT_TTL=${redisTtl}
NODE_NAME=${config.projectName}
PORT=${config.appPort}
DEFAULT_HANDLER_TIMEOUT=${handlerTimeout}
DEFAULT_PREHOOK_TIMEOUT=${prehookTimeout}
DEFAULT_AFTERHOOK_TIMEOUT=${afterhookTimeout}
SECRET_KEY=${secretKey}
SALT_ROUNDS=${saltRounds}
ACCESS_TOKEN_EXP=${accessTokenExp}
REFRESH_TOKEN_NO_REMEMBER_EXP=${refreshTokenNoRememberExp}
REFRESH_TOKEN_REMEMBER_EXP=${refreshTokenRememberExp}
PACKAGE_MANAGER=${config.packageManager}
BACKEND_URL=${backendUrl}
NODE_ENV=${nodeEnv}`;
}

module.exports = {
  generateEnvFile,
  generateEnvContent
};
