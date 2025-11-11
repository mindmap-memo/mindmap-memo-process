import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../../lib/auth';

// PUT /api/pages/[id] - Update page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const result = await sql`
      UPDATE pages
      SET
        name = ${body.name || ''},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Page not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE /api/pages/[id] - Delete page
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // CASCADE will automatically delete associated memos and categories
    const result = await sql`
      DELETE FROM pages
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Page not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
