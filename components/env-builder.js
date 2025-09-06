function generateEnvContent(config) {
  return `#DB SETTING
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
DB_IDLE_TIMEOUT=${config.dbIdleTimeout || '30000'}

#REDIS SETTING
REDIS_URI=${config.redisUri}
DEFAULT_TTL=${config.redisTTL}

#APP SETTING
MAX_VM_TIMEOUT_MS=${config.maxVmTimeout}
NODE_NAME=${config.nodeName}
PORT=${config.appPort}

#AUTH_SETTING
SECRET_KEY=${config.secretKey}
SALT_ROUNDS=${config.saltRounds}
ACCESS_TOKEN_EXP=${config.accessTokenExp}
REFRESH_TOKEN_NO_REMEMBER_EXP=${config.refreshTokenNoRemember}
REFRESH_TOKEN_REMEMBER_EXP=${config.refreshTokenRemember}

#ENVIRONMENT
NODE_ENV=${config.nodeEnv}`;
}

module.exports = {
  generateEnvContent
};