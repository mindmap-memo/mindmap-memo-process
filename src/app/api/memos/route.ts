import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// POST /api/memos - Create new memo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        id, page_id, title, blocks, tags, connections,
        position_x, position_y, width, height,
        display_size, importance, parent_id
      )
      VALUES (
        ${id},
        ${pageId},
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
