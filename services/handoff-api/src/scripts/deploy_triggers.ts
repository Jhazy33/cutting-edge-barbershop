#!/usr/bin/env tsx

/**
 * Deploy Knowledge Base Auto-Update Triggers
 *
 * This script deploys the migration 004 which adds:
 * - Enhanced feedback→learning queue trigger
 * - Enhanced corrections→learning queue trigger
 * - New conversation→suggested updates trigger
 * - Conflict detection and resolution
 * - Rollback mechanisms
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

async function deployTriggers() {
  const client = new Client({
    host: process.env.DB_HOST || '109.199.118.38',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = join(__dirname, '../../database/migrations/004_knowledge_auto_triggers_enhanced.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded');

    // Start transaction
    console.log('🔄 Starting transaction...');
    await client.query('BEGIN');

    // Execute migration
    console.log('🚀 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Commit transaction
    console.log('💾 Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Transaction committed');

    // Verify triggers
    console.log('🔍 Verifying triggers...');
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND trigger_name LIKE '%learning%'
      ORDER BY event_object_table, trigger_name;
    `);

    console.log(`\n✅ Found ${triggers.rows.length} learning-related triggers:`);
    triggers.rows.forEach(t => {
      console.log(`  - ${t.trigger_name}: ${t.event_manipulation} ON ${t.event_object_table}`);
    });

    // Verify functions
    console.log('\n🔍 Verifying functions...');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      AND (routine_name LIKE '%learning%' OR routine_name LIKE '%knowledge%' OR routine_name LIKE '%rollback%')
      ORDER BY routine_name;
    `);

    console.log(`\n✅ Found ${functions.rows.length} learning-related functions:`);
    functions.rows.forEach(f => {
      console.log(`  - ${f.routine_name}`);
    });

    console.log('\n🎉 Deployment complete!');
    console.log('📚 Next steps:');
    console.log('  1. Run verification tests: psql -f database/verify_auto_triggers.sql');
    console.log('  2. Monitor logs for any issues');
    console.log('  3. Test triggers with sample data');

  } catch (error) {
    // Rollback on error
    console.error('❌ Deployment failed:', error);
    await client.query('ROLLBACK');
    console.log('🔄 Transaction rolled back');
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run deployment
deployTriggers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
