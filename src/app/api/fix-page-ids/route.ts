import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireAuth } from '../../../lib/auth';

/**
 * POST /api/fix-page-ids
 * page_id가 "1"로 잘못 저장된 메모와 카테고리를 자동으로 수정
 */
export async function POST(request: NextRequest) {
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

    console.log(`[Fix Page IDs] Starting migration for user: ${user.email}`);

    // 1. 해당 사용자의 실제 페이지 중 가장 오래된 페이지 찾기 (튜토리얼 페이지)
    const pages = await sql`
      SELECT id, name, created_at
      FROM pages
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (pages.length === 0) {
      console.log(`[Fix Page IDs] No pages found for user: ${user.email}`);
      return NextResponse.json({
        success: true,
        message: 'No pages found for this user',
        updated: 0
      });
    }

    const correctPageId = pages[0].id;
    console.log(`[Fix Page IDs] Found correct page ID: ${correctPageId}`);

    // 2. page_id가 "1"인 메모 찾기
    const wrongMemos = await sql`
      SELECT id, title
      FROM memos
      WHERE user_id = ${user.id} AND page_id = '1'
    `;

    console.log(`[Fix Page IDs] Found ${wrongMemos.length} memos with wrong page_id`);

    // 3. page_id가 "1"인 카테고리 찾기
    const wrongCategories = await sql`
      SELECT id, title
      FROM categories
      WHERE user_id = ${user.id} AND page_id = '1'
    `;

    console.log(`[Fix Page IDs] Found ${wrongCategories.length} categories with wrong page_id`);

    let updatedMemos = 0;
    let updatedCategories = 0;

    // 4. 메모 업데이트
    if (wrongMemos.length > 0) {
      await sql`
        UPDATE memos
        SET page_id = ${correctPageId}, updated_at = NOW()
        WHERE user_id = ${user.id} AND page_id = '1'
      `;
      updatedMemos = wrongMemos.length;
      console.log(`[Fix Page IDs] Updated ${updatedMemos} memos`);
    }

    // 5. 카테고리 업데이트
    if (wrongCategories.length > 0) {
      await sql`
        UPDATE categories
        SET page_id = ${correctPageId}, updated_at = NOW()
        WHERE user_id = ${user.id} AND page_id = '1'
      `;
      updatedCategories = wrongCategories.length;
      console.log(`[Fix Page IDs] Updated ${updatedCategories} categories`);
    }

    // 6. quick_nav_items도 업데이트
    await sql`
      UPDATE quick_nav_items
      SET page_id = ${correctPageId}
      WHERE user_id = ${user.id} AND page_id = '1'
    `;

    console.log(`[Fix Page IDs] Migration completed for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Page IDs fixed successfully',
      correctPageId,
      updatedMemos,
      updatedCategories,
      details: {
        memos: wrongMemos.map(m => ({ id: m.id, title: m.title })),
        categories: wrongCategories.map(c => ({ id: c.id, title: c.title }))
      }
    });
  } catch (error) {
    console.error('Error fixing page IDs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        error: 'Failed to fix page IDs',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
