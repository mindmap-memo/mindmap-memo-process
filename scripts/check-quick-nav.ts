/**
 * quick_nav_items 상태 확인 스크립트
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkQuickNav() {
  console.log('🔍 Checking quick_nav_items status...\n');

  try {
    // 1. 현재 quick_nav_items 확인
    const quickNavItems = await sql`
      SELECT id, type, target_id, page_id, title
      FROM quick_nav_items
      ORDER BY created_at
    `;

    console.log(`📊 Total quick_nav_items: ${quickNavItems.length}\n`);

    if (quickNavItems.length === 0) {
      console.log('❌ No quick_nav_items found!\n');
    } else {
      quickNavItems.forEach((item: any) => {
        console.log(`- ${item.type} "${item.title}" (${item.target_id}) on page ${item.page_id}`);
      });
    }

    // 2. 실제로 존재하는 memos 확인
    const memos = await sql`SELECT id, title, page_id FROM memos ORDER BY created_at DESC LIMIT 10`;
    console.log(`\n📝 Recent memos (${memos.length}):`);
    memos.forEach((memo: any) => {
      console.log(`- "${memo.title}" (${memo.id}) on page ${memo.page_id}`);
    });

    // 3. 실제로 존재하는 categories 확인
    const categories = await sql`SELECT id, title, page_id FROM categories ORDER BY created_at DESC LIMIT 10`;
    console.log(`\n📁 Recent categories (${categories.length}):`);
    categories.forEach((cat: any) => {
      console.log(`- "${cat.title}" (${cat.id}) on page ${cat.page_id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkQuickNav()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
