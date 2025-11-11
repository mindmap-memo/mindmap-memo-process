import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

// POST /api/memos - Create new memo
export async function POST(request: NextRequest) {
  try {
    // DATABASE_URL 확인
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set');
      return NextResponse.json(
        { error: 'Database configuration error', details: 'DATABASE_URL is not set' },
        { status: 500 }
      );
    }

    const sql = neon(process.env.DATABASE_URL);

    // Require authentication
    let user;
    try {
      user = await requireAuth();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError instanceof Error ? authError.message : 'Unknown auth error' },
        { status: 401 }
      );
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        error: 'Failed to create memo',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
