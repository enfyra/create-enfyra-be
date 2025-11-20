const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const chalk = require('chalk');

async function validateDatabaseConnection(config) {
  const { dbType, dbHost, dbPort, dbUsername, dbPassword, dbName, mongoAuthSource } = config;

  console.log(chalk.gray(`\n🔍 Testing ${dbType} connection...`));

  try {
    if (dbType === 'mysql') {
      const connection = await mysql.createConnection({
        host: dbHost,
        port: parseInt(dbPort),
        user: dbUsername,
        password: dbPassword,
        connectTimeout: 5000
      });
      await connection.ping();
      await connection.end();

    } else if (dbType === 'postgres') {
      const client = new Client({
        host: dbHost,
        port: parseInt(dbPort),
        user: dbUsername,
        password: dbPassword,
        database: dbName || 'postgres',
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();

    } else if (dbType === 'mongodb') {
      const mongoUri = `mongodb://${dbUsername}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?authSource=${mongoAuthSource}`;
      const client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await client.connect();
      await client.db(dbName).admin().ping();
      await client.close();
    }

    console.log(chalk.green(`✅ Database connection successful`));
    return true;

  } catch (error) {
    console.log(chalk.red(`❌ Database connection failed: ${error.message}`));

    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow(`💡 Suggestions:`));
      console.log(chalk.yellow(`   • Check if ${dbType} server is running`));
      console.log(chalk.yellow(`   • Verify host and port: ${dbHost}:${dbPort}`));
      if (dbType === 'mongodb') {
        console.log(chalk.yellow(`   • Try: mongod (to start MongoDB)`));
      }
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === '28P01' || error.message.includes('Authentication failed')) {
      console.log(chalk.yellow(`💡 Suggestions:`));
      console.log(chalk.yellow(`   • Check username and password`));
      console.log(chalk.yellow(`   • Verify user has database access permissions`));
      if (dbType === 'mongodb') {
        console.log(chalk.yellow(`   • Verify auth source is correct (usually 'admin')`));
      }
    }

    return false;
  }
}

async function validateRedisConnection(redisUri) {
  console.log(chalk.gray(`\n🔍 Testing Redis connection...`));
  
  try {
    const redis = new Redis(redisUri, {
      connectTimeout: 5000,
      lazyConnect: true,
      retryDelayOnFailover: 0,
      maxRetriesPerRequest: 1
    });
    
    await redis.connect();
    await redis.ping();
    await redis.disconnect();
    
    console.log(chalk.green(`✅ Redis connection successful`));
    return true;
    
  } catch (error) {
    console.log(chalk.red(`❌ Redis connection failed: ${error.message}`));

    if (error.code === 'ECONNREFUSED') {
      console.log(chalk.yellow(`💡 Suggestions:`));
      console.log(chalk.yellow(`   • Check if Redis server is running`));
      console.log(chalk.yellow(`   • Verify Redis URI: ${redisUri}`));
      console.log(chalk.yellow(`   • Try: redis-server (to start Redis)`));
    } else if (error.message.includes('NOAUTH')) {
      console.log(chalk.yellow(`💡 Suggestions:`));
      console.log(chalk.yellow(`   • Redis requires authentication`));
      console.log(chalk.yellow(`   • Update URI: redis://username:password@host:port`));
    }
    
    return false;
  }
}

async function validateAllConnections(config) {
  console.log(chalk.cyan(`\n🧪 Validating connections...`));
  
  const dbValid = await validateDatabaseConnection(config);
  const redisValid = await validateRedisConnection(config.redisUri);
  
  if (dbValid && redisValid) {
    console.log(chalk.green(`\n✅ All connections validated successfully!\n`));
    return true;
  } else {
    console.log(chalk.red(`\n❌ Connection validation failed!`));
    console.log(chalk.yellow(`Please fix the connection issues and try again.\n`));
    return false;
  }
}

module.exports = {
  validateDatabaseConnection,
  validateRedisConnection,
  validateAllConnections
};