import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../../lib/auth';

const sql = neon(process.env.DATABASE_URL!);

// PUT /api/memos/[id] - Update memo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    const { id } = await params;
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    const body = JSON.parse(text);

    console.log(`[서버] 메모 업데이트, id: ${id}, user: ${user.email}`);
    console.log(`[서버] body.blocks:`, JSON.stringify(body.blocks, null, 2));

    // Update memo in database (only if owned by user)
    const result = await sql`
      UPDATE memos
      SET
        title = ${body.title || ''},
        blocks = ${JSON.stringify(body.blocks || [])},
        tags = ${JSON.stringify(body.tags || [])},
        connections = ${JSON.stringify(body.connections || [])},
        position_x = ${body.position?.x || 0},
        position_y = ${body.position?.y || 0},
        width = ${body.size?.width || null},
        height = ${body.size?.height || null},
        display_size = ${body.displaySize || 'medium'},
        importance = ${body.importance || null},
        parent_id = ${body.parentId || null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      console.log(`[서버] 메모 업데이트 실패: 권한 없음 또는 존재하지 않음`);
      return NextResponse.json(
        { error: 'Memo not found or unauthorized' },
        { status: 404 }
      );
    }

    console.log(`[서버] 메모 업데이트 완료`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating memo:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}

// DELETE /api/memos/[id] - Delete memo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    const { id } = await params;

    const result = await sql`
      DELETE FROM memos
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Memo not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memo:', error);
    return NextResponse.json(
      { error: 'Failed to delete memo' },
      { status: 500 }
    );
  }
}
