#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename: string) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`\n📝 Running migration: ${filename}`);

  const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error(`❌ Migration failed: ${error.message}`);
    throw error;
  }

  console.log(`✅ Migration complete: ${filename}`);
}

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database schema...\n');

  try {
    // Run migrations in order
    await runMigration('20251026000001_initial_schema.sql');
    await runMigration('20251026000002_indexes.sql');

    console.log('\n✅ Database setup complete!');
    console.log('\nTables created:');
    console.log('  - concepts');
    console.log('  - connections');
    console.log('  - critic_evaluations');
    console.log('  - ratings');
    console.log('  - prompt_templates');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
