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
    // 1. 전체 코호트 목록 (제외된 이메일 제외) - 날짜별로 그룹화
    const cohorts = await sql`
      SELECT
        DATE(first_login) as cohort,
        COUNT(DISTINCT user_email) as total_users,
        MIN(first_login) as cohort_start
      FROM user_cohorts
      WHERE user_email != ${EXCLUDED_EMAILS[0]}
        AND user_email != ${EXCLUDED_EMAILS[1]}
      GROUP BY DATE(first_login)
      ORDER BY cohort ASC
      LIMIT 12
    `;

    console.log('Cohorts found:', cohorts.length);
    if (cohorts.length > 0) {
      console.log('First cohort:', cohorts[0]);
    }

    // 2. 각 코호트의 기간별 리텐션
    const retentionData = [];
    const maxPeriods = 8; // Day 0 ~ Day 7
    const periodDays = 1; // 일간 분석

    for (const cohort of cohorts) {
      const cohortUsers = await sql`
        SELECT user_email
        FROM user_cohorts
        WHERE DATE(first_login) = ${cohort.cohort}
          AND user_email != ${EXCLUDED_EMAILS[0]}
          AND user_email != ${EXCLUDED_EMAILS[1]}
      `;

      const userEmails = cohortUsers.map((u: any) => u.user_email);

      // 기간별 리텐션 계산
      const periodRetention = [];

      for (let period = 0; period < maxPeriods; period++) {
        // Day N = 가입일로부터 N일 후
        // cohort.cohort는 UTC timestamp이므로 한국 시간(+9h)으로 변환 후 날짜만 추출
        const cohortDate = new Date(cohort.cohort);

        // 한국 시간으로 변환 (+9시간)
        cohortDate.setHours(cohortDate.getHours() + 9);

        // 한국 시간 기준 날짜 문자열 추출
        const kstDateStr = cohortDate.toISOString().split('T')[0];

        // 목표 날짜 계산 (period일 후)
        const [year, month, day] = kstDateStr.split('-').map(Number);
        const targetDate = new Date(Date.UTC(year, month - 1, day + period));
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const activeUsersResult = await sql`
          SELECT COUNT(DISTINCT user_email) as active_count
          FROM analytics_sessions
          WHERE user_email = ANY(${userEmails})
            AND DATE(session_start) = ${targetDateStr}
            AND user_email != ${EXCLUDED_EMAILS[0]}
            AND user_email != ${EXCLUDED_EMAILS[1]}
        `;

        const activeUsers = Number(activeUsersResult[0]?.active_count || 0);
        const retentionRate = cohort.total_users > 0
          ? (activeUsers / cohort.total_users) * 100
          : 0;

        periodRetention.push({
          period,
          activeUsers,
          retentionRate: Math.round(retentionRate * 10) / 10
        });
      }

      retentionData.push({
        cohort: cohort.cohort,
        totalUsers: Number(cohort.total_users),
        retentionByPeriod: periodRetention
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
