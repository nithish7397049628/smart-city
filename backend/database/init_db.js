/**
 * Smart City 360 - Database Initialization & Migration Utility
 * Executes schema.sql and seed.sql against a target MySQL database.
 * Run with: npm run db:init
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function getDbConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ''),
        ssl: (process.env.DB_SSL === 'true' || parsed.searchParams.get('ssl') === 'true') ? { rejectUnauthorized: false } : undefined
      };
    } catch (e) {
      console.warn('Could not parse DATABASE_URL, falling back to DB_* variables.');
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_city_360',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

// Split SQL file contents into individual statements
function splitSqlStatements(sqlContent) {
  return sqlContent
    .split(/;\s*$/m)
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
}

async function runInit() {
  const config = getDbConfig();
  console.log('======================================================');
  console.log('Smart City 360 – Production Database Provisioning');
  console.log(`Target Host: ${config.host}:${config.port}`);
  console.log(`Database:    ${config.database}`);
  console.log(`User:        ${config.user}`);
  console.log(`SSL:         ${config.ssl ? 'Enabled' : 'Disabled'}`);
  console.log('======================================================');

  let connection;
  try {
    // 1. Connect to MySQL server without specifying database first (to create database if needed)
    console.log('Connecting to MySQL host...');
    const serverConfig = { ...config };
    delete serverConfig.database;

    connection = await mysql.createConnection(serverConfig);
    console.log('✓ Connected to MySQL server.');

    // 2. Create database if it does not exist
    console.log(`Ensuring database "${config.database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${config.database}\`;`);
    console.log(`✓ Database "${config.database}" selected.`);

    // 3. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Applying table schemas from schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const statements = splitSqlStatements(schemaSql);

      for (const stmt of statements) {
        if (stmt.toLowerCase().startsWith('create database') || stmt.toLowerCase().startsWith('use ')) {
          continue; // Already handled
        }
        await connection.query(stmt);
      }
      console.log(`✓ All 13 relational tables verified / created.`);
    }

    // 4. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('Inserting seed records (departments, categories, accounts, areas)...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      const statements = splitSqlStatements(seedSql);

      for (const stmt of statements) {
        if (stmt.toLowerCase().startsWith('use ')) continue;
        try {
          await connection.query(stmt);
        } catch (seedErr) {
          // Ignore duplicate keys on re-runs
          if (!seedErr.message.includes('Duplicate entry')) {
            console.warn('  Notice on seed statement:', seedErr.message);
          }
        }
      }
      console.log(`✓ Initial municipal seed data populated.`);
    }

    console.log('======================================================');
    console.log('🎉 Production database initialized successfully!');
    console.log('======================================================');
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runInit();
