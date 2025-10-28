import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// PUT /api/memos/[id] - Update memo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log(`[서버] 메모 업데이트, id: ${id}`);
    console.log(`[서버] body.blocks:`, JSON.stringify(body.blocks, null, 2));

    // Update memo in database
    await sql`
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
      WHERE id = ${id}
    `;

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
    const { id } = await params;

    await sql`
      DELETE FROM memos
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memo:', error);
    return NextResponse.json(
      { error: 'Failed to delete memo' },
      { status: 500 }
    );
  }
}
