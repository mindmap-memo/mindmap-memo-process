import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/analytics/device-stats
 * 기기별 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 기기 타입별 통계
    const deviceStats = await sql`
      SELECT
        device_type,
        COUNT(DISTINCT id) as sessions,
        COUNT(DISTINCT user_email) as unique_users,
        COALESCE(AVG(duration_seconds), 0) as avg_session_duration
      FROM analytics_sessions
      WHERE session_start >= ${startDate}
        AND session_start <= ${endDate}
        AND device_type IS NOT NULL
      GROUP BY device_type
      ORDER BY sessions DESC
    `;

    // 브라우저별 통계
    const browserStats = await sql`
      SELECT
        browser,
        COUNT(DISTINCT id) as sessions,
        COUNT(DISTINCT user_email) as unique_users
      FROM analytics_sessions
      WHERE session_start >= ${startDate}
        AND session_start <= ${endDate}
        AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY sessions DESC
    `;

    // OS별 통계
    const osStats = await sql`
      SELECT
        os,
        COUNT(DISTINCT id) as sessions,
        COUNT(DISTINCT user_email) as unique_users
      FROM analytics_sessions
      WHERE session_start >= ${startDate}
        AND session_start <= ${endDate}
        AND os IS NOT NULL
      GROUP BY os
      ORDER BY sessions DESC
    `;

    // 전체 세션 수 계산 (백분율 계산용)
    const totalSessions = deviceStats.reduce((sum, stat) => sum + Number(stat.sessions), 0);

    // 백분율 추가
    const deviceStatsWithPercentage = deviceStats.map(stat => ({
      deviceType: stat.device_type,
      sessions: Number(stat.sessions),
      uniqueUsers: Number(stat.unique_users),
      avgSessionDuration: Math.round(Number(stat.avg_session_duration)),
      percentage: totalSessions > 0 ? Math.round((Number(stat.sessions) / totalSessions) * 100) : 0
    }));

    const browserStatsWithPercentage = browserStats.map(stat => ({
      browser: stat.browser,
      sessions: Number(stat.sessions),
      uniqueUsers: Number(stat.unique_users),
      percentage: totalSessions > 0 ? Math.round((Number(stat.sessions) / totalSessions) * 100) : 0
    }));

    const osStatsWithPercentage = osStats.map(stat => ({
      os: stat.os,
      sessions: Number(stat.sessions),
      uniqueUsers: Number(stat.unique_users),
      percentage: totalSessions > 0 ? Math.round((Number(stat.sessions) / totalSessions) * 100) : 0
    }));

    return NextResponse.json({
      deviceStats: deviceStatsWithPercentage,
      browserStats: browserStatsWithPercentage,
      osStats: osStatsWithPercentage
    });
  } catch (error) {
    console.error('Device stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device stats' },
      { status: 500 }
    );
  }
}
