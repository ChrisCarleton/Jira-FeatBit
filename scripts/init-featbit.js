#!/usr/bin/env node
// Initializes the FeatBit PostgreSQL database by running all SQL migration files.
// Usage: yarn init-featbit
//   --reset  Drop the existing "featbit" database before seeding (wipes all data)

import { spawnSync } from 'child_process';

const CONTAINER = 'postgresql';
const PG_USER = 'postgres';
const RESET = process.argv.includes('--reset');

// All SQL files in the order they must be applied.
const SQL_FILES = [
  'v0.0.0.sql',
  'v5.0.4.sql',
  'v5.0.5.sql',
  'v5.1.0.sql',
  'v5.2.0.sql',
  'v5.2.1.sql',
  'v5.3.0.sql',
];

function docker(...args) {
  return spawnSync('docker', ['compose', 'exec', '-T', CONTAINER, ...args], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
}

// Verify the PostgreSQL container is running.
const check = spawnSync(
  'docker',
  ['compose', 'ps', '--status', 'running', '-q', CONTAINER],
  {
    encoding: 'utf8',
  }
);
if (!check.stdout.trim()) {
  console.error('Error: the "postgresql" container is not running.');
  console.error('Start FeatBit first:  docker compose up -d');
  process.exit(1);
}

if (RESET) {
  console.log('Dropping existing "featbit" database...');
  const drop = docker(
    'psql',
    '-U',
    PG_USER,
    '-c',
    'DROP DATABASE IF EXISTS featbit;'
  );
  if (drop.status !== 0) {
    console.error('Failed to drop database.');
    process.exit(1);
  }
}

for (const file of SQL_FILES) {
  console.log(`Applying ${file}...`);
  const result = docker(
    'psql',
    '-U',
    PG_USER,
    '-f',
    `/docker-entrypoint-initdb.d/${file}`
  );
  if (result.status !== 0) {
    console.error(`\nFailed applying ${file}.`);
    if (file === 'v0.0.0.sql') {
      console.error(
        'If the "featbit" database already exists, re-run with --reset to wipe and re-seed:'
      );
      console.error('  yarn init-featbit --reset');
    }
    process.exit(1);
  }
}

console.log('\nFeatBit database ready.');
console.log('  Admin UI : http://localhost:8081');
console.log('  Login    : test@featbit.com / 123456');
