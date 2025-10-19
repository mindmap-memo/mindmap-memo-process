// Check database for invalid data
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

async function checkDatabase() {
  const sql = neon(env.DATABASE_URL);

  console.log('🔍 Checking database for invalid data...\n');

  try {
    // Check for blocks with invalid importance_ranges
    const blocks = await sql`
      SELECT id, memo_id, block_type, importance, importance_ranges
      FROM content_blocks
      WHERE importance_ranges IS NOT NULL
    `;

    console.log(`📊 Found ${blocks.length} blocks with importance_ranges\n`);

    let invalidCount = 0;
    blocks.forEach((block, index) => {
      try {
        if (block.importance_ranges) {
          JSON.parse(block.importance_ranges);
        }
      } catch (e) {
        invalidCount++;
        console.log(`❌ Block ${index + 1}:`, {
          id: block.id,
          memo_id: block.memo_id,
          block_type: block.block_type,
          importance_ranges: block.importance_ranges,
          error: e.message
        });
      }
    });

    if (invalidCount === 0) {
      console.log('✅ No invalid importance_ranges found!');
    } else {
      console.log(`\n⚠️  Found ${invalidCount} blocks with invalid importance_ranges`);
      console.log('\nTo fix, run:');
      console.log('UPDATE content_blocks SET importance_ranges = NULL WHERE id IN (...)');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();
