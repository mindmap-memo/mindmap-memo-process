import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, position, width, height, parentId, isExpanded } = body;

    // Verify category belongs to user's page
    const existing = await sql`
      SELECT c.id
      FROM categories c
      JOIN pages p ON c.page_id = p.id
      WHERE c.id = ${id} AND p.user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Update category
    await sql`
      UPDATE categories
      SET
        title = COALESCE(${title !== undefined ? title : null}, title),
        position_x = COALESCE(${position?.x !== undefined ? position.x : null}, position_x),
        position_y = COALESCE(${position?.y !== undefined ? position.y : null}, position_y),
        width = COALESCE(${width !== undefined ? width : null}, width),
        height = COALESCE(${height !== undefined ? height : null}, height),
        parent_id = ${parentId !== undefined ? parentId : null},
        is_expanded = COALESCE(${isExpanded !== undefined ? isExpanded : null}, is_expanded),
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Fetch updated category
    const updated = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, parent_id, is_expanded, created_at, updated_at
      FROM categories
      WHERE id = ${id}
    `;

    const cat = updated[0];
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

    return NextResponse.json({ category: result });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify category belongs to user's page
    const existing = await sql`
      SELECT c.id
      FROM categories c
      JOIN pages p ON c.page_id = p.id
      WHERE c.id = ${id} AND p.user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete category
    await sql`
      DELETE FROM categories WHERE id = ${id}
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
