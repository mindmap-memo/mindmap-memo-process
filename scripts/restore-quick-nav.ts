/**
 * 삭제된 quick_nav_items 복구 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/restore-quick-nav.ts
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 아까 삭제된 quick_nav_items 목록
const deletedItems = [
  { id: '0bfc1c90-0946-4420-b27f-af0a33530112', type: 'memo', target_id: 'memo-1761994001851' },
  { id: '3d20458d-f6e2-4736-8d66-11fd171435c4', type: 'category', target_id: 'category-1761030254469' },
  { id: 'ce5f20f5-5dfb-42a9-9a18-7e7834ddf93e', type: 'category', target_id: 'category-1761053073064' },
  { id: '2fa40441-55c2-4b0d-9b1b-332504e49054', type: 'memo', target_id: 'memo-1761141028919' },
  { id: '7fd09d6a-55cd-4d5e-aae5-19803573626d', type: 'memo', target_id: 'memo-1761141033547' },
  { id: '1a45c7e4-16c0-4131-8d73-fc6939e158ce', type: 'category', target_id: 'category-1761616337924' },
  { id: '8d3d6c9a-5444-4b09-8c34-ea157dc00b51', type: 'category', target_id: 'category-1761616338388' },
  { id: 'test-quicknav-1-1761624601382', type: 'memo', target_id: 'test-memo-1-1761624601382' },
  { id: 'test-quicknav-2-1761624601382', type: 'category', target_id: 'test-category-2-1761624601382' },
  { id: 'test-quicknav-1-1761624903040', type: 'memo', target_id: 'test-memo-1-1761624903040' },
  { id: 'test-quicknav-2-1761624903040', type: 'category', target_id: 'test-category-2-1761624903040' },
  { id: 'test-quicknav-1-1761625081052', type: 'memo', target_id: 'test-memo-1-1761625081052' },
  { id: 'test-quicknav-2-1761625081052', type: 'category', target_id: 'test-category-2-1761625081052' },
  { id: '356dfe94-777a-46ac-b9ac-a521d02e1dc9', type: 'category', target_id: '1-tutorial-category' },
  { id: 'b2379b16-5a01-4ec2-9c5c-b48011ac5a76', type: 'category', target_id: 'category-1761866137122' },
  { id: '1408e645-5e58-4b70-9bb0-b597db6da6eb', type: 'memo', target_id: '1-memo-rightpanel-category' },
];

async function restoreQuickNav() {
  console.log('🔄 Restoring deleted quick_nav_items...\n');

  try {
    let restoredCount = 0;
    let skippedCount = 0;

    for (const item of deletedItems) {
      // 1. target이 아직 존재하는지 확인
      let targetExists = false;
      let targetTitle = '';
      let pageId = '';

      if (item.type === 'memo') {
        const memos = await sql`SELECT title, page_id FROM memos WHERE id = ${item.target_id}`;
        if (memos.length > 0) {
          targetExists = true;
          targetTitle = memos[0].title || 'Untitled Memo';
          pageId = memos[0].page_id;
        }
      } else if (item.type === 'category') {
        const categories = await sql`SELECT title, page_id FROM categories WHERE id = ${item.target_id}`;
        if (categories.length > 0) {
          targetExists = true;
          targetTitle = categories[0].title || 'Untitled Category';
          pageId = categories[0].page_id;
        }
      }

      // 2. target이 존재하면 복구
      if (targetExists) {
        await sql`
          INSERT INTO quick_nav_items (id, user_id, type, target_id, page_id, title, created_at)
          VALUES (
            ${item.id},
            'default-user',
            ${item.type},
            ${item.target_id},
            ${pageId},
            ${targetTitle},
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `;
        console.log(`✅ Restored: ${item.type} "${targetTitle}" (${item.target_id})`);
        restoredCount++;
      } else {
        console.log(`⏭️  Skipped (target not found): ${item.type} ${item.target_id}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Restored: ${restoredCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   📝 Total: ${deletedItems.length}`);

    if (restoredCount > 0) {
      console.log(`\n✅ Successfully restored ${restoredCount} quick_nav_items!`);
    }

  } catch (error) {
    console.error('❌ Error during restoration:', error);
    throw error;
  }
}

// 스크립트 실행
restoreQuickNav()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
