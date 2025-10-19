import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// DELETE /api/quick-nav/[id] - Delete quick nav item
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify item belongs to user
    const existing = await sql`
      SELECT id FROM quick_nav_items
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Quick nav item not found' }, { status: 404 });
    }

    // Delete item
    await sql`
      DELETE FROM quick_nav_items
      WHERE id = ${id} AND user_id = ${session.user.id}
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
