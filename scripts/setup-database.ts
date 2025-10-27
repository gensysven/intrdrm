#!/usr/bin/env tsx

/**
 * Database Setup Instructions
 *
 * Since Supabase doesn't support executing raw SQL via RPC from client libraries,
 * you need to run the migration files manually through the Supabase Dashboard.
 *
 * This script will:
 * 1. Read all migration files
 * 2. Display the SQL content
 * 3. Provide instructions for manual execution
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

function printMigrationInstructions() {
  console.log('🚀 Supabase Database Setup Instructions\n');
  console.log('========================================\n');

  console.log('Supabase does not support executing raw SQL via the client library.');
  console.log('You need to run migrations manually through the Supabase Dashboard.\n');

  console.log('📋 Steps to set up your database:\n');
  console.log('1. Go to your Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('/v1', '')}\n`);
  console.log('2. Navigate to: SQL Editor (left sidebar)\n');
  console.log('3. Run the following migration files IN ORDER:\n');

  const migrations = [
    '20251026000001_initial_schema.sql',
    '20251026000002_indexes.sql'
  ];

  migrations.forEach((filename, index) => {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration ${index + 1}: ${filename}`);
    console.log('='.repeat(60));

    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      console.log('\nFile location:');
      console.log(`  ${migrationPath}\n`);
      console.log('SQL Content:');
      console.log('---');
      console.log(sql);
      console.log('---\n');
    } else {
      console.log(`\n⚠️  File not found: ${migrationPath}\n`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('After running all migrations, you should have:');
  console.log('='.repeat(60));
  console.log('\nTables:');
  console.log('  ✓ concepts');
  console.log('  ✓ connections');
  console.log('  ✓ critic_evaluations');
  console.log('  ✓ ratings');
  console.log('  ✓ prompt_templates');
  console.log('\nIndexes:');
  console.log('  ✓ Performance indexes on all tables');
  console.log('\nFunctions:');
  console.log('  ✓ update_updated_at_column()');
  console.log('\nTriggers:');
  console.log('  ✓ update_concepts_updated_at\n');

  console.log('='.repeat(60));
  console.log('💡 Alternative: Supabase CLI');
  console.log('='.repeat(60));
  console.log('\nIf you have Supabase CLI installed, you can run:');
  console.log('  supabase db push\n');
  console.log('Or apply migrations individually:');
  console.log('  supabase db execute --file supabase/migrations/20251026000001_initial_schema.sql');
  console.log('  supabase db execute --file supabase/migrations/20251026000002_indexes.sql\n');
}

printMigrationInstructions();
