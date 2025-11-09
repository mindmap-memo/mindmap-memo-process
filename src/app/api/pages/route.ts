import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/pages - Get all pages with their memos and categories
export async function GET() {
  try {
    // Require authentication
    const user = await requireAuth();

    // Fetch all pages for this user
    const pages = await sql`
      SELECT id, name, created_at, updated_at
      FROM pages
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    // Fetch all memos for this user
    const memos = await sql`
      SELECT
        id, page_id, title, blocks, tags, connections,
        position_x, position_y, width, height,
        display_size, importance, parent_id
      FROM memos
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    // Fetch all categories for this user
    const categories = await sql`
      SELECT
        id, page_id, title, tags, connections,
        position_x, position_y, original_position_x, original_position_y,
        width, height, is_expanded, children, parent_id
      FROM categories
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `;

    // Fetch all quick nav items for this user
    const quickNavItems = await sql`
      SELECT
        id, type, target_id, page_id, title, created_at
      FROM quick_nav_items
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    // Organize data by page
    const pagesData = pages.map((page: any) => {
      const pageMemos = memos
        .filter((memo: any) => memo.page_id === page.id)
        .map((memo: any) => {
          console.log(`[API] 메모 처리 시작: ${memo.id}`);

          // blocks 배열 안전하게 처리: importanceRanges가 배열인지 확인
          const safeBlocks = Array.isArray(memo.blocks)
            ? memo.blocks.map((block: any, blockIndex: number) => {
                console.log(`[API] 메모 ${memo.id} - 블록 ${blockIndex} 처리:`, {
                  type: block.type,
                  hasImportanceRanges: 'importanceRanges' in block,
                  importanceRangesType: typeof block.importanceRanges,
                  isArray: Array.isArray(block.importanceRanges)
                });

                // text 블록인 경우 importanceRanges 필드 보장
                if (block.type === 'text') {
                  // importanceRanges가 없거나 배열이 아니면 빈 배열로 대체
                  if (!block.importanceRanges || !Array.isArray(block.importanceRanges)) {
                    console.log(`[API] 메모 ${memo.id} - 블록 ${blockIndex}: importanceRanges 수정됨 (${typeof block.importanceRanges} → [])`);
                    return {
                      ...block,
                      importanceRanges: []
                    };
                  }
                  // importanceRanges가 배열이지만 유효하지 않은 항목이 있으면 필터링
                  const validRanges = block.importanceRanges.filter(
                    (range: any) => range && typeof range === 'object' &&
                                    typeof range.start === 'number' &&
                                    typeof range.end === 'number'
                  );
                  if (validRanges.length !== block.importanceRanges.length) {
                    console.log(`[API] 메모 ${memo.id} - 블록 ${blockIndex}: 유효하지 않은 범위 필터링됨 (${block.importanceRanges.length} → ${validRanges.length})`);
                  }
                  return {
                    ...block,
                    importanceRanges: validRanges
                  };
                }
                return block;
              })
            : [];

          console.log(`[API] 메모 ${memo.id} 처리 완료: ${safeBlocks.length}개 블록`);

          return {
            id: memo.id,
            title: memo.title || '',
            content: '', // 기존 호환성을 위해 빈 문자열로 초기화
            blocks: safeBlocks,
            tags: memo.tags || [],
            connections: memo.connections || [],
            position: { x: Number(memo.position_x), y: Number(memo.position_y) },
            size: memo.width && memo.height
              ? { width: Number(memo.width), height: Number(memo.height) }
              : undefined,
            displaySize: memo.display_size || 'medium',
            importance: memo.importance || undefined,
            parentId: memo.parent_id || undefined,
          };
        });

      const pageCategories = categories
        .filter((category: any) => category.page_id === page.id)
        .map((category: any) => ({
          id: category.id,
          title: category.title || '',
          tags: category.tags || [],
          connections: category.connections || [],
          position: { x: Number(category.position_x), y: Number(category.position_y) },
          originalPosition: category.original_position_x && category.original_position_y
            ? { x: Number(category.original_position_x), y: Number(category.original_position_y) }
            : undefined,
          size: category.width && category.height
            ? { width: Number(category.width), height: Number(category.height) }
            : undefined,
          isExpanded: category.is_expanded !== false,
          children: category.children || [],
          parentId: category.parent_id || undefined,
        }));

      const pageQuickNavItems = quickNavItems
        .filter((item: any) => item.page_id === page.id)
        .map((item: any) => ({
          id: item.id,
          name: item.title || '',
          targetId: item.target_id,
          targetType: item.type,
          pageId: item.page_id
        }));

      return {
        id: page.id,
        name: page.name,
        memos: pageMemos,
        categories: pageCategories,
        quickNavItems: pageQuickNavItems,
      };
    });

    return NextResponse.json({ pages: pagesData });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/pages - Create new page
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO pages (id, name, user_id)
      VALUES (${id}, ${name}, ${user.id})
    `;

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
