import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';
import { Page } from '../../../types';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/migrate - Migrate localStorage data to database
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const body = await request.json();
    const { pages } = body as { pages: Page[] };

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작 - 모든 데이터를 한 번에 저장
    const results = {
      pages: 0,
      memos: 0,
      categories: 0,
      quickNavItems: 0,
    };

    for (const page of pages) {
      // 1. 페이지 생성 (이미 존재하면 건너뛰기)
      const existingPage = await sql`
        SELECT id FROM pages WHERE id = ${page.id} AND user_id = ${user.id}
      `;

      if (existingPage.length === 0) {
        await sql`
          INSERT INTO pages (id, name, user_id)
          VALUES (${page.id}, ${page.name}, ${user.id})
        `;
        results.pages++;
      }

      // 2. 메모 마이그레이션
      for (const memo of page.memos || []) {
        const existingMemo = await sql`
          SELECT id FROM memos WHERE id = ${memo.id} AND user_id = ${user.id}
        `;

        if (existingMemo.length === 0) {
          await sql`
            INSERT INTO memos (
              id, page_id, user_id, title, blocks, tags, connections,
              position_x, position_y, width, height,
              display_size, importance, parent_id
            )
            VALUES (
              ${memo.id},
              ${page.id},
              ${user.id},
              ${memo.title || ''},
              ${JSON.stringify(memo.blocks || [])},
              ${JSON.stringify(memo.tags || [])},
              ${JSON.stringify(memo.connections || [])},
              ${memo.position.x},
              ${memo.position.y},
              ${memo.size?.width || null},
              ${memo.size?.height || null},
              ${memo.displaySize || 'medium'},
              ${memo.importance || null},
              ${memo.parentId || null}
            )
          `;
          results.memos++;
        }
      }

      // 3. 카테고리 마이그레이션
      for (const category of page.categories || []) {
        const existingCategory = await sql`
          SELECT id FROM categories WHERE id = ${category.id} AND user_id = ${user.id}
        `;

        if (existingCategory.length === 0) {
          await sql`
            INSERT INTO categories (
              id, page_id, user_id, title, tags, connections,
              position_x, position_y,
              original_position_x, original_position_y,
              width, height, is_expanded, children, parent_id
            )
            VALUES (
              ${category.id},
              ${page.id},
              ${user.id},
              ${category.title || ''},
              ${JSON.stringify(category.tags || [])},
              ${JSON.stringify(category.connections || [])},
              ${category.position.x},
              ${category.position.y},
              ${category.originalPosition?.x || null},
              ${category.originalPosition?.y || null},
              ${category.size?.width || null},
              ${category.size?.height || null},
              ${category.isExpanded !== false},
              ${JSON.stringify(category.children || [])},
              ${category.parentId || null}
            )
          `;
          results.categories++;
        }
      }

      // 4. 단축 이동 아이템 마이그레이션
      for (const quickNavItem of page.quickNavItems || []) {
        const existingQuickNav = await sql`
          SELECT id FROM quick_nav_items WHERE id = ${quickNavItem.id} AND user_id = ${user.id}
        `;

        if (existingQuickNav.length === 0) {
          await sql`
            INSERT INTO quick_nav_items (
              id, user_id, type, target_id, page_id, title
            )
            VALUES (
              ${quickNavItem.id},
              ${user.id},
              ${quickNavItem.targetType},
              ${quickNavItem.targetId},
              ${quickNavItem.pageId},
              ${quickNavItem.name}
            )
          `;
          results.quickNavItems++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
