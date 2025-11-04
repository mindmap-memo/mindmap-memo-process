import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 제외할 이메일 목록
const EXCLUDED_EMAILS = ['movevibecom@gmail.com', 'ghpjhjh@gmail.com'];

/**
 * GET /api/analytics/devices
 * 기기별 사용 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // N일 전 날짜 계산 (JavaScript로 직접 계산)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // 기기별 사용자 수 및 세션 수
    const deviceStats = await sql`
      SELECT
        device_type,
        COUNT(DISTINCT user_email) as user_count,
        COUNT(*) as session_count
      FROM analytics_sessions
      WHERE session_start >= ${startDateStr}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
        AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY session_count DESC
    `;

    // 기기별 평균 세션 시간
    const deviceDuration = await sql`
      SELECT
        device_type,
        AVG(duration_seconds) as avg_duration_seconds
      FROM analytics_sessions
      WHERE session_start >= ${startDateStr}
        AND user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
        AND device_type IS NOT NULL
        AND duration_seconds IS NOT NULL
      GROUP BY device_type
    `;

    // 결과 병합
    const stats = deviceStats.map((stat: any) => {
      const duration = deviceDuration.find(
        (d: any) => d.device_type === stat.device_type
      );

      return {
        deviceType: stat.device_type,
        userCount: Number(stat.user_count),
        sessionCount: Number(stat.session_count),
        avgDurationSeconds: duration
          ? Math.round(Number(duration.avg_duration_seconds))
          : 0,
      };
    });

    return NextResponse.json({ devices: stats });
  } catch (error) {
    console.error('Device analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device statistics' },
      { status: 500 }
    );
  }
}
