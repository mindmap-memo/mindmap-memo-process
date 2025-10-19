import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/memos/[id] - Update memo
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      position,
      width,
      height,
      displayWidth,
      displayHeight,
      displaySize,
      blocks,
      connections,
      tags,
      importance,
      parentId,
    } = body;

    // Verify memo belongs to user's page
    const existing = await sql`
      SELECT m.id, m.page_id
      FROM memos m
      JOIN pages p ON m.page_id = p.id
      WHERE m.id = ${id} AND p.user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    const pageId = existing[0].page_id;

    // Update memo fields
    await sql`
      UPDATE memos
      SET
        title = COALESCE(${title !== undefined ? title : null}, title),
        position_x = COALESCE(${position?.x !== undefined ? position.x : null}, position_x),
        position_y = COALESCE(${position?.y !== undefined ? position.y : null}, position_y),
        width = COALESCE(${width !== undefined ? width : null}, width),
        height = COALESCE(${height !== undefined ? height : null}, height),
        display_width = COALESCE(${displayWidth !== undefined ? displayWidth : null}, display_width),
        display_height = COALESCE(${displayHeight !== undefined ? displayHeight : null}, display_height),
        display_size = COALESCE(${displaySize !== undefined ? displaySize : null}, display_size),
        importance = COALESCE(${importance !== undefined ? importance : null}, importance),
        parent_id = ${parentId !== undefined ? parentId : null},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Update content blocks if provided
    if (blocks !== undefined) {
      // Get existing block IDs
      const existingBlocks = await sql`
        SELECT id FROM content_blocks WHERE memo_id = ${id}
      `;
      const existingBlockIds = new Set(existingBlocks.map((b: any) => b.id));
      const newBlockIds = new Set(blocks.map((b: any) => b.id).filter(Boolean));

      // Delete blocks that are no longer in the new blocks array
      const blocksToDelete = Array.from(existingBlockIds).filter(id => !newBlockIds.has(id));
      if (blocksToDelete.length > 0) {
        await sql`
          DELETE FROM content_blocks
          WHERE id = ANY(${blocksToDelete})
        `;
      }

      // Upsert blocks (insert or update)
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const blockId = block.id || crypto.randomUUID();

        await sql`
          INSERT INTO content_blocks (
            id, memo_id, block_type, block_content, checked,
            language, caption, importance, importance_ranges, block_order
          )
          VALUES (
            ${blockId}, ${id}, ${block.type}, ${block.content || ''},
            ${block.checked || false}, ${block.language || null},
            ${block.caption || null}, ${block.importance || null},
            ${block.importanceRanges ? JSON.stringify(block.importanceRanges) : null}, ${i}
          )
          ON CONFLICT (id) DO UPDATE SET
            block_type = EXCLUDED.block_type,
            block_content = EXCLUDED.block_content,
            checked = EXCLUDED.checked,
            language = EXCLUDED.language,
            caption = EXCLUDED.caption,
            importance = EXCLUDED.importance,
            importance_ranges = EXCLUDED.importance_ranges,
            block_order = EXCLUDED.block_order,
            updated_at = NOW()
        `;
      }
    }

    // Update connections if provided
    if (connections !== undefined) {
      // Delete existing connections from this memo
      await sql`
        DELETE FROM connections WHERE from_memo_id = ${id}
      `;

      // Insert new connections (이제 connections는 string 배열)
      for (const targetMemoId of connections) {
        // targetMemoId가 유효한지 확인
        if (targetMemoId && typeof targetMemoId === 'string') {
          const connId = crypto.randomUUID();
          await sql`
            INSERT INTO connections (
              id, from_memo_id, to_memo_id, from_direction, to_direction
            )
            VALUES (
              ${connId}, ${id}, ${targetMemoId}, 'right', 'left'
            )
          `;
        }
      }
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await sql`
        DELETE FROM tags WHERE memo_id = ${id}
      `;

      // Insert new tags
      for (const tag of tags) {
        const tagId = crypto.randomUUID();
        await sql`
          INSERT INTO tags (id, memo_id, tag_name)
          VALUES (${tagId}, ${id}, ${tag})
        `;
      }
    }

    // Fetch updated memo
    const updated = await sql`
      SELECT
        id, page_id, title, position_x, position_y,
        width, height, display_width, display_height,
        display_size, importance, created_at, updated_at
      FROM memos
      WHERE id = ${id}
    `;

    const updatedBlocks = await sql`
      SELECT
        id, memo_id, block_type, block_content, checked,
        language, caption, importance, importance_ranges, block_order
      FROM content_blocks
      WHERE memo_id = ${id}
      ORDER BY block_order ASC
    `;

    const updatedConnections = await sql`
      SELECT from_memo_id, to_memo_id, from_direction, to_direction
      FROM connections
      WHERE from_memo_id = ${id}
    `;

    const updatedTags = await sql`
      SELECT tag_name
      FROM tags
      WHERE memo_id = ${id}
    `;

    const memo = updated[0];
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
      tags: updatedTags.map((t: any) => t.tag_name),
      content: '', // Legacy field
      blocks: updatedBlocks.map((b: any) => ({
        id: b.id,
        type: b.block_type,
        content: b.block_content,
        checked: b.checked,
        language: b.language,
        caption: b.caption,
        importance: b.importance,
        importanceRanges: b.importance_ranges, // JSONB는 이미 객체로 반환됨
      })),
      connections: updatedConnections.map((c: any) => c.to_memo_id), // 간단하게 ID만 반환
    };

    return NextResponse.json({ memo: result });
  } catch (error) {
    console.error('Error updating memo:', error);
    return NextResponse.json(
      { error: 'Failed to update memo' },
      { status: 500 }
    );
  }
}

// DELETE /api/memos/[id] - Delete memo
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify memo belongs to user's page
    const existing = await sql`
      SELECT m.id
      FROM memos m
      JOIN pages p ON m.page_id = p.id
      WHERE m.id = ${id} AND p.user_id = ${session.user.id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 });
    }

    // Delete memo (cascading deletes will handle blocks and connections)
    await sql`
      DELETE FROM memos WHERE id = ${id}
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
