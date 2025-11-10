const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

async function generateEnvFile(projectPath, config) {
  const envContent = generateEnvContent(config);
  const envPath = path.join(projectPath, '.env');
  
  await fs.writeFile(envPath, envContent);
}

function generateEnvContent(config) {
  const redisTtl = config.configureRedis ? config.redisTtl : '5';
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
    dbSection = `############################################
# Database (RDBMS) - required
############################################
# One of: mysql | postgres | mongodb
DB_TYPE=mongodb

############################################
# MongoDB (only if DB_TYPE=mongodb) - optional
############################################
# Full connection string
MONGO_URI=${mongoUri}`;
  } else {
    dbSection = `############################################
# Database (RDBMS) - required
############################################
# One of: mysql | postgres | mongodb
DB_TYPE=${config.dbType}
# Hostname/IP of the SQL server
DB_HOST=${config.dbHost}
# Port: mysql=3306, postgres=5432
DB_PORT=${config.dbPort}
# SQL user/password
DB_USERNAME=${config.dbUsername}
DB_PASSWORD=${config.dbPassword}
# Database name
DB_NAME=${config.dbName}`;

    if (config.configurePool) {
      poolSection = `
############################################
# SQL Connection Pool - optional (tune per env)
############################################
# Max connections in pool
DB_POOL_SIZE=${config.dbPoolSize}
# MySQL connection limit or Postgres max connections
DB_CONNECTION_LIMIT=${config.dbConnectionLimit}
# Connection acquisition timeout (ms)
DB_ACQUIRE_TIMEOUT=${config.dbAcquireTimeout}
# PostgreSQL idle connection timeout (ms)
DB_IDLE_TIMEOUT=${config.dbIdleTimeout}`;
    } else {
      poolSection = `
############################################
# SQL Connection Pool - optional (tune per env)
############################################
# Max connections in pool
DB_POOL_SIZE=100
# MySQL connection limit or Postgres max connections
DB_CONNECTION_LIMIT=100
# Connection acquisition timeout (ms)
DB_ACQUIRE_TIMEOUT=60000
# PostgreSQL idle connection timeout (ms)
DB_IDLE_TIMEOUT=30000`;
    }
  }

  return `${dbSection}${poolSection}

############################################
# Redis Cache - required
############################################
# redis://user:pass@host:port/db
REDIS_URI=${config.redisUri}
# Default TTL (seconds) for cache entries
DEFAULT_TTL=${redisTtl}

############################################
# App Runtime - required
############################################
# Node instance name (for logs/cluster)
NODE_NAME=${config.projectName}
# HTTP port
PORT=${config.appPort}
# Script execution timeouts (ms)
DEFAULT_HANDLER_TIMEOUT=${handlerTimeout}
DEFAULT_PREHOOK_TIMEOUT=${prehookTimeout}
DEFAULT_AFTERHOOK_TIMEOUT=${afterhookTimeout}

############################################
# Auth - required
############################################
# JWT secret
SECRET_KEY=${secretKey}
# bcrypt salt rounds
SALT_ROUNDS=${saltRounds}
# Access/Refresh token expirations
ACCESS_TOKEN_EXP=${accessTokenExp}
REFRESH_TOKEN_NO_REMEMBER_EXP=${refreshTokenNoRememberExp}
REFRESH_TOKEN_REMEMBER_EXP=${refreshTokenRememberExp}

############################################
# Package Manager - optional
############################################
# One of: yarn | npm | pnpm
PACKAGE_MANAGER=${config.packageManager}

############################################
# Swagger / Public Base URL - required
############################################
# Full backend URL exposed to clients (e.g. behind proxy)
BACKEND_URL=${backendUrl}

############################################
# Environment - required
############################################
# development | production | test
NODE_ENV=${nodeEnv}`;
}

module.exports = {
  generateEnvFile,
  generateEnvContent
};
