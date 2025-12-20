const mysql = require('mysql2/promise');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const chalk = require('chalk');

function parseDatabaseUri(uri) {
  try {
    const url = new URL(uri);
    const protocol = url.protocol.replace(':', '');
    const host = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : (protocol === 'mysql' ? 3306 : 5432);
    const user = url.username || '';
    const password = url.password || '';
    const database = url.pathname ? url.pathname.replace(/^\//, '') : '';

    return { host, port, user, password, database };
  } catch (error) {
    throw new Error(`Invalid database URI format: ${uri}`);
  }
}

async function validateDatabaseConnection(config) {
  const { dbType, dbUri, mongoUri, setupReplica, dbReplicaUri } = config;

  console.log(chalk.gray(`\n🔍 Testing ${dbType} connection...`));

  try {
    if (dbType === 'mysql') {
      const parsed = parseDatabaseUri(dbUri);
      const connection = await mysql.createConnection({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        connectTimeout: 5000
      });
      await connection.ping();
      await connection.end();

      if (setupReplica && dbReplicaUri) {
        console.log(chalk.gray(`\n🔍 Testing replica connection...`));
        const replicaParsed = parseDatabaseUri(dbReplicaUri);
        const replicaConnection = await mysql.createConnection({
          host: replicaParsed.host,
          port: replicaParsed.port,
          user: replicaParsed.user,
          password: replicaParsed.password,
          connectTimeout: 5000
        });
        await replicaConnection.ping();
        await replicaConnection.end();
        console.log(chalk.green(`✅ Replica connection successful`));
      }

    } else if (dbType === 'postgres') {
      const parsed = parseDatabaseUri(dbUri);
      const client = new Client({
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database || 'postgres',
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      if (setupReplica && dbReplicaUri) {
        console.log(chalk.gray(`\n🔍 Testing replica connection...`));
        const replicaParsed = parseDatabaseUri(dbReplicaUri);
        const replicaClient = new Client({
          host: replicaParsed.host,
          port: replicaParsed.port,
          user: replicaParsed.user,
          password: replicaParsed.password,
          database: replicaParsed.database || 'postgres',
          connectionTimeoutMillis: 5000
        });
        await replicaClient.connect();
        await replicaClient.query('SELECT 1');
        await replicaClient.end();
        console.log(chalk.green(`✅ Replica connection successful`));
      }

    } else if (dbType === 'mongodb') {
      const client = new MongoClient(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      await client.connect();
      const dbName = mongoUri.match(/\/([^/?]+)(\?|$)/)?.[1] || 'enfyra';
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
      if (dbType === 'mongodb') {
        const parsed = mongoUri ? new URL(mongoUri) : null;
        if (parsed) {
          console.log(chalk.yellow(`   • Verify host and port: ${parsed.hostname}:${parsed.port || 27017}`));
        }
        console.log(chalk.yellow(`   • Try: mongod (to start MongoDB)`));
      } else {
        const parsed = dbUri ? parseDatabaseUri(dbUri) : null;
        if (parsed) {
          console.log(chalk.yellow(`   • Verify host and port: ${parsed.host}:${parsed.port}`));
        }
        if (setupReplica && dbReplicaUri && error.message.includes('replica')) {
          const replicaParsed = parseDatabaseUri(dbReplicaUri);
          console.log(chalk.yellow(`   • Verify replica host and port: ${replicaParsed.host}:${replicaParsed.port}`));
        }
      }
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === '28P01' || error.message.includes('Authentication failed')) {
      console.log(chalk.yellow(`💡 Suggestions:`));
      console.log(chalk.yellow(`   • Check username and password`));
      console.log(chalk.yellow(`   • Verify user has database access permissions`));
      if (dbType === 'mongodb') {
        console.log(chalk.yellow(`   • Verify auth source is correct (usually 'admin')`));
      }
      if (setupReplica && dbReplicaUri && error.message.includes('replica')) {
        console.log(chalk.yellow(`   • Check replica username and password`));
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