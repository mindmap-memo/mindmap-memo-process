import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/categories?pageId=xxx - Get all categories for a page
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Verify page belongs to user
    const page = await sql`
      SELECT id FROM pages WHERE id = ${pageId} AND user_id = ${session.user.id}
    `;

    if (page.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get all categories for this page
    const categories = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, parent_id, is_expanded, created_at, updated_at
      FROM categories
      WHERE page_id = ${pageId}
      ORDER BY created_at ASC
    `;

    const categoriesData = categories.map((cat: any) => ({
      id: cat.id,
      title: cat.title,
      position: { x: cat.position_x, y: cat.position_y },
      width: cat.width,
      height: cat.height,
      parentId: cat.parent_id,
      isExpanded: cat.is_expanded,
      children: [], // Will be populated by client
    }));

    return NextResponse.json({ categories: categoriesData });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, title, position, width, height, parentId, isExpanded } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Verify page belongs to user
    const page = await sql`
      SELECT id FROM pages WHERE id = ${pageId} AND user_id = ${session.user.id}
    `;

    if (page.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const categoryId = crypto.randomUUID();

    // Create category
    await sql`
      INSERT INTO categories (
        id, page_id, title, position_x, position_y,
        width, height, parent_id, is_expanded
      )
      VALUES (
        ${categoryId}, ${pageId}, ${title || ''},
        ${position?.x || 0}, ${position?.y || 0},
        ${width || 200}, ${height || 100},
        ${parentId || null}, ${isExpanded !== undefined ? isExpanded : true}
      )
    `;

    // Fetch created category
    const created = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, parent_id, is_expanded, created_at, updated_at
      FROM categories
      WHERE id = ${categoryId}
    `;

    const cat = created[0];
    const result = {
      id: cat.id,
      title: cat.title,
      position: { x: cat.position_x, y: cat.position_y },
      width: cat.width,
      height: cat.height,
      parentId: cat.parent_id,
      isExpanded: cat.is_expanded,
      children: [],
    };

    return NextResponse.json({ category: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
