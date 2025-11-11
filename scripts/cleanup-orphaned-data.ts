/**
 * 데이터베이스에서 orphaned data (원본이 삭제된 데이터) 정리 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/cleanup-orphaned-data.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function cleanupOrphanedData() {
  console.log('🔍 Checking for orphaned data...\n');

  try {
    // 1. 모든 페이지 ID 가져오기
    const pages = await sql`SELECT id FROM pages`;
    const validPageIds = pages.map(p => p.id);
    console.log(`✅ Valid pages: ${validPageIds.length}`);
    console.log(`   IDs: ${validPageIds.join(', ')}\n`);

    // 2. orphaned memos 찾기
    const orphanedMemos = await sql`
      SELECT id, title, page_id
      FROM memos
      WHERE page_id NOT IN (SELECT id FROM pages)
    `;
    console.log(`🔴 Orphaned memos found: ${orphanedMemos.length}`);
    if (orphanedMemos.length > 0) {
      orphanedMemos.forEach((memo: any) => {
        console.log(`   - Memo ${memo.id}: "${memo.title}" (page_id: ${memo.page_id})`);
      });
    }

    // 3. orphaned categories 찾기
    const orphanedCategories = await sql`
      SELECT id, title, page_id
      FROM categories
      WHERE page_id NOT IN (SELECT id FROM pages)
    `;
    console.log(`\n🔴 Orphaned categories found: ${orphanedCategories.length}`);
    if (orphanedCategories.length > 0) {
      orphanedCategories.forEach((cat: any) => {
        console.log(`   - Category ${cat.id}: "${cat.title}" (page_id: ${cat.page_id})`);
      });
    }

    // 4. orphaned quick_nav_items 찾기
    const orphanedQuickNav = await sql`
      SELECT qn.id, qn.target_id, qn.type
      FROM quick_nav_items qn
      WHERE
        (qn.type = 'memo' AND NOT EXISTS (SELECT 1 FROM memos m WHERE m.id = qn.target_id))
        OR
        (qn.type = 'category' AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = qn.target_id))
    `;
    console.log(`\n🔴 Orphaned quick_nav_items found: ${orphanedQuickNav.length}`);
    if (orphanedQuickNav.length > 0) {
      orphanedQuickNav.forEach((item: any) => {
        console.log(`   - QuickNav ${item.id}: ${item.type} ${item.target_id}`);
      });
    }

    // 5. 정리 여부 확인
    const totalOrphaned = orphanedMemos.length + orphanedCategories.length + orphanedQuickNav.length;

    if (totalOrphaned === 0) {
      console.log('\n✅ No orphaned data found. Database is clean!');
      return;
    }

    console.log(`\n⚠️  Total orphaned records: ${totalOrphaned}`);
    console.log('\n🧹 Cleaning up orphaned data...\n');

    // 6. orphaned data 삭제
    if (orphanedMemos.length > 0) {
      const deletedMemos = await sql`
        DELETE FROM memos
        WHERE page_id NOT IN (SELECT id FROM pages)
        RETURNING id
      `;
      console.log(`✅ Deleted ${deletedMemos.length} orphaned memos`);
    }

    if (orphanedCategories.length > 0) {
      const deletedCategories = await sql`
        DELETE FROM categories
        WHERE page_id NOT IN (SELECT id FROM pages)
        RETURNING id
      `;
      console.log(`✅ Deleted ${deletedCategories.length} orphaned categories`);
    }

    if (orphanedQuickNav.length > 0) {
      const deletedQuickNav = await sql`
        DELETE FROM quick_nav_items qn
        WHERE
          (qn.type = 'memo' AND NOT EXISTS (SELECT 1 FROM memos m WHERE m.id = qn.target_id))
          OR
          (qn.type = 'category' AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = qn.target_id))
        RETURNING id
      `;
      console.log(`✅ Deleted ${deletedQuickNav.length} orphaned quick_nav_items`);
    }

    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// 스크립트 실행
cleanupOrphanedData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
