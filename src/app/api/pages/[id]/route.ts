import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/pages/[id] - Update page name
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
    }

    // Verify page belongs to user
    const existing = await sql`
      SELECT id FROM pages WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    await sql`
      UPDATE pages
      SET name = ${name}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    const updated = await sql`
      SELECT id, name, created_at, updated_at
      FROM pages
      WHERE id = ${id}
    `;

    return NextResponse.json({ page: updated[0] });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/[id] - Delete page
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify page belongs to user
    const existing = await sql`
      SELECT id FROM pages WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Delete page (cascading deletes will handle memos, categories, etc.)
    await sql`
      DELETE FROM pages WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
