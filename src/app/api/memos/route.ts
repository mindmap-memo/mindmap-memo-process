import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET /api/memos?pageId=xxx - Get all memos for a page
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Verify page belongs to user
    const page = await sql`
      SELECT id FROM pages WHERE id = ${pageId} AND user_id = ${session.user.id}
    `;

    if (page.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Get all memos for this page
    const memos = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, display_width, display_height,
        display_size, importance, created_at, updated_at
      FROM memos
      WHERE page_id = ${pageId}
      ORDER BY created_at ASC
    `;

    // Get content blocks for all memos
    const memoIds = memos.map((m: any) => m.id);
    let blocks: any[] = [];

    if (memoIds.length > 0) {
      blocks = await sql`
        SELECT
          id, memo_id, block_type, block_content, checked,
          language, caption, importance, importance_ranges, block_order
        FROM content_blocks
        WHERE memo_id = ANY(${memoIds})
        ORDER BY memo_id, block_order ASC
      `;
    }

    // Get connections for all memos
    let connections: any[] = [];

    if (memoIds.length > 0) {
      connections = await sql`
        SELECT from_memo_id, to_memo_id, from_direction, to_direction
        FROM connections
        WHERE from_memo_id = ANY(${memoIds})
      `;
    }

    // Get tags for all memos
    let tags: any[] = [];

    if (memoIds.length > 0) {
      tags = await sql`
        SELECT memo_id, tag_name
        FROM tags
        WHERE memo_id = ANY(${memoIds})
      `;
    }

    // Organize data
    const memosWithBlocks = memos.map((memo: any) => ({
      id: memo.id,
      title: memo.title,
      position: { x: memo.position_x, y: memo.position_y },
      width: memo.width,
      height: memo.height,
      displayWidth: memo.display_width,
      displayHeight: memo.display_height,
      displaySize: memo.display_size || 'medium',
      importance: memo.importance,
      tags: tags
        .filter((t: any) => t.memo_id === memo.id)
        .map((t: any) => t.tag_name),
      content: '', // Legacy field, not used anymore
      blocks: blocks
        .filter((b: any) => b.memo_id === memo.id)
        .map((b: any) => ({
          id: b.id,
          type: b.block_type,
          content: b.block_content,
          checked: b.checked,
          language: b.language,
          caption: b.caption,
          importance: b.importance,
          importanceRanges: b.importance_ranges, // JSONB는 이미 객체로 반환됨
        })),
      connections: connections
        .filter((c: any) => c.from_memo_id === memo.id)
        .map((c: any) => c.to_memo_id), // 간단하게 ID만 반환
    }));

    return NextResponse.json({ memos: memosWithBlocks });
  } catch (error) {
    console.error('Error fetching memos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memos' },
      { status: 500 }
    );
  }
}

// POST /api/memos - Create new memo
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, title, position, blocks, importance, displaySize } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
    }

    // Verify page belongs to user
    const page = await sql`
      SELECT id FROM pages WHERE id = ${pageId} AND user_id = ${session.user.id}
    `;

    if (page.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const memoId = crypto.randomUUID();

    // Create memo
    await sql`
      INSERT INTO memos (
        id, page_id, title, position_x, position_y, display_size, importance
      )
      VALUES (
        ${memoId}, ${pageId}, ${title || ''},
        ${position?.x || 0}, ${position?.y || 0}, ${displaySize || 'medium'}, ${importance || 0}
      )
    `;

    // Create content blocks if provided
    if (blocks && blocks.length > 0) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockId = block.id || crypto.randomUUID();

        await sql`
          INSERT INTO content_blocks (
            id, memo_id, block_type, block_content, checked,
            language, caption, importance, importance_ranges, block_order
          )
          VALUES (
            ${blockId}, ${memoId}, ${block.type}, ${block.content || ''},
            ${block.checked || false}, ${block.language || null},
            ${block.caption || null}, ${block.importance || null},
            ${block.importanceRanges ? JSON.stringify(block.importanceRanges) : null}, ${i}
          )
        `;
      }
    }

    // Fetch the created memo with blocks
    const createdMemo = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, display_width, display_height,
        display_size, importance, created_at, updated_at
      FROM memos
      WHERE id = ${memoId}
    `;

    const createdBlocks = await sql`
      SELECT
        id, memo_id, block_type, block_content, checked,
        language, caption, importance, importance_ranges, block_order
      FROM content_blocks
      WHERE memo_id = ${memoId}
      ORDER BY block_order ASC
    `;

    const memo = createdMemo[0];
    const result = {
      id: memo.id,
      title: memo.title,
      position: { x: memo.position_x, y: memo.position_y },
      width: memo.width,
      height: memo.height,
      displayWidth: memo.display_width,
      displayHeight: memo.display_height,
      displaySize: memo.display_size || 'medium',
      importance: memo.importance,
      tags: [], // Legacy field
      content: '', // Legacy field
      blocks: createdBlocks.map((b: any) => ({
        id: b.id,
        type: b.block_type,
        content: b.block_content,
        checked: b.checked,
        language: b.language,
        caption: b.caption,
        importance: b.importance,
        importanceRanges: b.importance_ranges, // JSONB는 이미 객체로 반환됨
      })),
      connections: [],
    };

    return NextResponse.json({ memo: result }, { status: 201 });
  } catch (error) {
    console.error('Error creating memo:', error);
    return NextResponse.json(
      { error: 'Failed to create memo' },
      { status: 500 }
    );
  }
}
