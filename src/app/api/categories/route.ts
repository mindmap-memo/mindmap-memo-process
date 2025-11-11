import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const text = await request.text();
    if (!text) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    const body = JSON.parse(text);
    const {
      id,
      pageId,
      title = '',
      tags = [],
      connections = [],
      position,
      originalPosition,
      size,
      isExpanded = true,
      children = [],
      parentId,
    } = body;

    if (!id || !pageId) {
      return NextResponse.json(
        { error: 'id and pageId are required' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO categories (
        id, page_id, user_id, title, tags, connections,
        position_x, position_y, original_position_x, original_position_y,
        width, height, is_expanded, children, parent_id
      )
      VALUES (
        ${id},
        ${pageId},
        ${user.id},
        ${title},
        ${JSON.stringify(tags)},
        ${JSON.stringify(connections)},
        ${position?.x || 0},
        ${position?.y || 0},
        ${originalPosition?.x || position?.x || 0},
        ${originalPosition?.y || position?.y || 0},
        ${size?.width || null},
        ${size?.height || null},
        ${isExpanded},
        ${JSON.stringify(children)},
        ${parentId || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        tags = EXCLUDED.tags,
        connections = EXCLUDED.connections,
        position_x = EXCLUDED.position_x,
        position_y = EXCLUDED.position_y,
        original_position_x = EXCLUDED.original_position_x,
        original_position_y = EXCLUDED.original_position_y,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        is_expanded = EXCLUDED.is_expanded,
        children = EXCLUDED.children,
        parent_id = EXCLUDED.parent_id,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
