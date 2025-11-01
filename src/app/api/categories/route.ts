import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    const body = await request.json();
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
