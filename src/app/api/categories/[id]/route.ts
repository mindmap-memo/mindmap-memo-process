import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Update category in database
    await sql`
      UPDATE categories
      SET
        title = ${body.title || ''},
        tags = ${JSON.stringify(body.tags || [])},
        connections = ${JSON.stringify(body.connections || [])},
        position_x = ${body.position?.x || 0},
        position_y = ${body.position?.y || 0},
        original_position_x = ${body.originalPosition?.x || body.position?.x || 0},
        original_position_y = ${body.originalPosition?.y || body.position?.y || 0},
        width = ${body.size?.width || null},
        height = ${body.size?.height || null},
        is_expanded = ${body.isExpanded !== undefined ? body.isExpanded : true},
        children = ${JSON.stringify(body.children || [])},
        parent_id = ${body.parentId || null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM categories
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
