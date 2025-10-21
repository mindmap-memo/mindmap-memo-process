import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// PUT /api/quick-nav/[id] - Update quick nav item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE quick_nav_items
      SET title = ${title}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quick nav item:', error);
    return NextResponse.json(
      { error: 'Failed to update quick nav item' },
      { status: 500 }
    );
  }
}

// DELETE /api/quick-nav/[id] - Delete quick nav item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM quick_nav_items
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quick nav item:', error);
    return NextResponse.json(
      { error: 'Failed to delete quick nav item' },
      { status: 500 }
    );
  }
}
