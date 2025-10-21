import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/pages - Get all pages with their memos and categories
export async function GET() {
  try {
    // Fetch all pages
    const pages = await sql`
      SELECT id, name, created_at, updated_at
      FROM pages
      ORDER BY created_at ASC
    `;

    // Fetch all memos
    const memos = await sql`
      SELECT
        id, page_id, title, blocks, tags, connections,
        position_x, position_y, width, height,
        display_size, importance, parent_id
      FROM memos
      ORDER BY created_at ASC
    `;

    // Fetch all categories
    const categories = await sql`
      SELECT
        id, page_id, title, tags, connections,
        position_x, position_y, original_position_x, original_position_y,
        width, height, is_expanded, children, parent_id
      FROM categories
      ORDER BY created_at ASC
    `;

    // Fetch all quick nav items
    const quickNavItems = await sql`
      SELECT
        id, type, target_id, page_id, title, created_at
      FROM quick_nav_items
      ORDER BY created_at DESC
    `;

    // Organize data by page
    const pagesData = pages.map((page: any) => {
      const pageMemos = memos
        .filter((memo: any) => memo.page_id === page.id)
        .map((memo: any) => {
          console.log(`[서버] 메모 로딩, id: ${memo.id}, blocks:`, JSON.stringify(memo.blocks, null, 2));
          return {
            id: memo.id,
            title: memo.title || '',
            content: '', // 기존 호환성을 위해 빈 문자열로 초기화
            blocks: memo.blocks || [],
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
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'id and name are required' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO pages (id, name)
      VALUES (${id}, ${name})
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
