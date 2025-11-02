import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// 제외할 이메일 목록
const EXCLUDED_EMAILS = ['movevibecom@gmail.com', 'ghpjhjh@gmail.com'];

/**
 * GET /api/analytics/cohort
 * 코호트 분석 데이터 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'week'; // 'week' or 'month'

    // 코호트별 사용자 수 및 리텐션 계산
    const cohortField = type === 'week' ? 'cohort_week' : 'cohort_month';

    // 1. 전체 코호트 목록 (제외된 이메일 제외)
    const cohorts = await sql`
      SELECT
        ${cohortField} as cohort,
        COUNT(DISTINCT user_email) as total_users,
        MIN(first_login) as cohort_start
      FROM user_cohorts
      WHERE user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY ${cohortField}
      ORDER BY cohort DESC
      LIMIT 12
    `;

    // 2. 각 코호트의 기간별 리텐션
    const retentionData = [];
    const maxPeriods = type === 'week' ? 12 : 30; // 12 weeks or 30 days
    const periodDays = type === 'week' ? 7 : 1;

    for (const cohort of cohorts) {
      const cohortUsers = await sql`
        SELECT user_email
        FROM user_cohorts
        WHERE ${cohortField} = ${cohort.cohort}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
      `;

      const userEmails = cohortUsers.map((u: any) => u.user_email);

      // 기간별 활성 사용자 계산
      const periodRetention = [];
      for (let period = 0; period < maxPeriods; period++) {
        const periodStart = new Date(cohort.cohort_start);
        periodStart.setDate(periodStart.getDate() + (period * periodDays));

        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + periodDays);

        const activeUsers = await sql`
          SELECT COUNT(DISTINCT user_email) as count
          FROM analytics_sessions
          WHERE user_email = ANY(${userEmails})
            AND session_start >= ${periodStart.toISOString()}
            AND session_start < ${periodEnd.toISOString()}
            AND user_email != ${EXCLUDED_EMAILS[0]}
            AND user_email != ${EXCLUDED_EMAILS[1]}
        `;

        const activeCount = Number(activeUsers[0]?.count || 0);
        const retentionRate = cohort.total_users > 0
          ? (activeCount / cohort.total_users) * 100
          : 0;

        periodRetention.push({
          period,
          activeUsers: activeCount,
          retentionRate: Math.round(retentionRate * 10) / 10
        });
      }

      retentionData.push({
        cohort: cohort.cohort,
        totalUsers: Number(cohort.total_users),
        retentionByPeriod: periodRetention,
        type
      });
    }

    return NextResponse.json({ cohorts: retentionData });
  } catch (error) {
    console.error('Cohort analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 }
    );
  }
}
