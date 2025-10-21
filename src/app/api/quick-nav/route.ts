import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/quick-nav - Get all quick nav items
export async function GET() {
  try {
    const items = await sql`
      SELECT
        id, type, target_id, page_id, title, created_at
      FROM quick_nav_items
      ORDER BY created_at DESC
    `;

    const quickNavItems = items.map((item: any) => ({
      id: item.id,
      type: item.type,
      itemId: item.target_id,
      pageId: item.page_id,
      title: item.title || '',
    }));

    return NextResponse.json({ items: quickNavItems });
  } catch (error) {
    console.error('Error fetching quick nav items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick nav items' },
      { status: 500 }
    );
  }
}

// POST /api/quick-nav - Create new quick nav item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, itemId, pageId, title } = body;

    if (!type || !itemId || !pageId) {
      return NextResponse.json(
        { error: 'type, itemId, and pageId are required' },
        { status: 400 }
      );
    }

    // Check if item already exists
    const existing = await sql`
      SELECT id FROM quick_nav_items
      WHERE target_id = ${itemId}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Item already in quick nav' },
        { status: 409 }
      );
    }

    const quickNavId = crypto.randomUUID();

    await sql`
      INSERT INTO quick_nav_items (
        id, user_id, type, target_id, page_id, title
      )
      VALUES (
        ${quickNavId}, 'default-user', ${type}, ${itemId}, ${pageId}, ${title || ''}
      )
    `;

    const created = await sql`
      SELECT
        id, type, target_id, page_id, title, created_at
      FROM quick_nav_items
      WHERE id = ${quickNavId}
    `;

    const item = created[0];
    const result = {
      id: item.id,
      type: item.type,
      itemId: item.target_id,
      pageId: item.page_id,
      title: item.title || '',
    };

    return NextResponse.json({ item: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating quick nav item:', error);
    return NextResponse.json(
      { error: 'Failed to create quick nav item' },
      { status: 500 }
    );
  }
}
