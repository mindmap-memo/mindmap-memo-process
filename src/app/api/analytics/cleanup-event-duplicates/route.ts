import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/analytics/cleanup-event-duplicates
 * 중복된 이벤트 데이터 정리
 * 1. 같은 세션, 같은 이벤트 타입, 같은 초(second) 내의 중복 이벤트 삭제
 * 2. search_performed 이벤트의 경우 같은 세션 내에서 비슷한 시간대(5초 이내)의 유사 검색어는 최종 검색어만 남김
 */
export async function POST() {
  try {
    // 1. 일반 이벤트 중복 확인 (같은 세션, 같은 타입, 같은 초)
    const generalDuplicates = await sql`
      SELECT
        session_id,
        event_type,
        DATE_TRUNC('second', created_at) as event_second,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_type != 'search_performed'
      GROUP BY session_id, event_type, DATE_TRUNC('second', created_at)
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${generalDuplicates.length} general event duplicate groups`);

    // 2. 일반 이벤트 중복 삭제 (각 그룹별로 가장 먼저 기록된 하나만 남김)
    await sql`
      WITH ranked_events AS (
        SELECT
          id,
          session_id,
          user_email,
          event_type,
          event_data,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY session_id, event_type, DATE_TRUNC('second', created_at)
            ORDER BY created_at ASC
          ) as rn
        FROM analytics_events
        WHERE event_type != 'search_performed'
      )
      DELETE FROM analytics_events
      WHERE id IN (
        SELECT id
        FROM ranked_events
        WHERE rn > 1
      )
    `;

    // 3. search_performed 이벤트 중복 확인
    // 같은 세션 내에서 5초 이내의 검색 이벤트 중 마지막 것만 남김
    const searchDuplicates = await sql`
      SELECT
        session_id,
        DATE_TRUNC('second', created_at) - INTERVAL '2 second' as time_window_start,
        DATE_TRUNC('second', created_at) + INTERVAL '3 second' as time_window_end,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_type = 'search_performed'
      GROUP BY session_id, DATE_TRUNC('second', created_at)
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${searchDuplicates.length} search event groups`);

    // 4. search_performed 중복 삭제 (5초 이내의 검색은 마지막 것만 남김)
    await sql`
      WITH search_windows AS (
        SELECT
          id,
          session_id,
          created_at,
          event_data,
          LAG(created_at) OVER (
            PARTITION BY session_id
            ORDER BY created_at
          ) as prev_timestamp,
          LEAD(created_at) OVER (
            PARTITION BY session_id
            ORDER BY created_at
          ) as next_timestamp
        FROM analytics_events
        WHERE event_type = 'search_performed'
      ),
      duplicates_to_delete AS (
        SELECT id
        FROM search_windows
        WHERE
          -- 다음 검색이 5초 이내에 있으면 현재 것 삭제 (타이핑 중인 검색)
          (next_timestamp IS NOT NULL AND next_timestamp - created_at < INTERVAL '5 seconds')
      )
      DELETE FROM analytics_events
      WHERE id IN (SELECT id FROM duplicates_to_delete)
    `;

    // 5. 정리 후 통계
    const stats = await sql`
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT event_type) as unique_event_types
      FROM analytics_events
    `;

    const eventTypeCounts = await sql`
      SELECT event_type, COUNT(*) as count
      FROM analytics_events
      GROUP BY event_type
      ORDER BY count DESC
    `;

    return NextResponse.json({
      success: true,
      cleaned: {
        generalDuplicates: generalDuplicates.length,
        searchDuplicates: searchDuplicates.length,
      },
      stats: stats[0],
      eventTypeCounts: eventTypeCounts,
      message: `Cleaned up ${generalDuplicates.length} general duplicates and ${searchDuplicates.length} search duplicate groups. ${stats[0].total_events} total events remaining.`
    });
  } catch (error) {
    console.error('Cleanup event duplicates error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup event duplicates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
