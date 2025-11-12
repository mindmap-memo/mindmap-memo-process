import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/analytics/drop-error-logs
 * error_logs 테이블 삭제
 */
export async function POST() {
  try {
    // error_logs 테이블 삭제
    await sql`DROP TABLE IF EXISTS error_logs`;

    console.log('error_logs table dropped successfully');

    return NextResponse.json({
      success: true,
      message: 'error_logs table dropped successfully'
    });
  } catch (error) {
    console.error('Drop error_logs table error:', error);
    return NextResponse.json(
      { error: 'Failed to drop error_logs table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
