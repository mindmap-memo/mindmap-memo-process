import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/pages - Get all pages for current user
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await sql`
      SELECT id, name, created_at, updated_at
      FROM pages
      WHERE user_id = ${session.user.id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/pages - Create new page
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Page name is required' }, { status: 400 });
    }

    const pageId = crypto.randomUUID();

    await sql`
      INSERT INTO pages (id, user_id, name)
      VALUES (${pageId}, ${session.user.id}, ${name})
    `;

    const newPage = await sql`
      SELECT id, name, created_at, updated_at
      FROM pages
      WHERE id = ${pageId}
    `;

    return NextResponse.json({ page: newPage[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
