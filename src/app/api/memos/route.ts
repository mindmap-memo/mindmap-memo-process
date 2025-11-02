import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/memos - Create new memo
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
      blocks = [],
      tags = [],
      connections = [],
      position,
      size,
      displaySize = 'medium',
      importance,
      parentId,
    } = body;

    if (!id || !pageId) {
      return NextResponse.json(
        { error: 'id and pageId are required' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO memos (
        id, page_id, user_id, title, blocks, tags, connections,
        position_x, position_y, width, height,
        display_size, importance, parent_id
      )
      VALUES (
        ${id},
        ${pageId},
        ${user.id},
        ${title},
        ${JSON.stringify(blocks)},
        ${JSON.stringify(tags)},
        ${JSON.stringify(connections)},
        ${position?.x || 0},
        ${position?.y || 0},
        ${size?.width || null},
        ${size?.height || null},
        ${displaySize},
        ${importance || null},
        ${parentId || null}
      )
    `;

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating memo:', error);
    return NextResponse.json(
      { error: 'Failed to create memo' },
      { status: 500 }
    );
  }
}
