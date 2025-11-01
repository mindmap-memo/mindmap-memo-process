import { NextResponse } from 'next/server';
import { createAnalyticsTables } from '@/features/analytics/utils/createTables';

/**
 * GET /api/analytics/setup
 * Analytics 테이블 생성 (개발용)
 *
 * 브라우저에서 한 번만 실행:
 * http://localhost:3000/api/analytics/setup
 */
export async function GET() {
  try {
    await createAnalyticsTables();

    return NextResponse.json({
      success: true,
      message: 'Analytics tables created successfully!'
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
