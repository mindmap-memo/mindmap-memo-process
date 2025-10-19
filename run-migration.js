// Migration script to add importance columns to content_blocks table
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');
const env = {};

envLines.forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

async function runMigration() {
  const sql = neon(env.DATABASE_URL);

  console.log('🔄 Starting database migration...');
  console.log('📊 Database:', env.PGDATABASE);
  console.log('');

  try {
    // Add importance column for non-text blocks
    console.log('Adding importance column...');
    await sql`
      ALTER TABLE content_blocks
      ADD COLUMN IF NOT EXISTS importance TEXT
    `;
    console.log('✅ importance column added');

    // Add importance_ranges column for text blocks
    console.log('Adding importance_ranges column...');
    await sql`
      ALTER TABLE content_blocks
      ADD COLUMN IF NOT EXISTS importance_ranges JSONB
    `;
    console.log('✅ importance_ranges column added');

    // Verify the changes
    console.log('\n📋 Verifying columns...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'content_blocks'
      ORDER BY ordinal_position
    `;

    console.log('\n📊 Current content_blocks table structure:');
    console.table(columns);

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
