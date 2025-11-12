import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { isEmailExcluded } from '@/features/analytics/utils/excludedEmails';

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/analytics/event
 * 이벤트 기록
 */
export async function POST(request: NextRequest) {
  try {
    // 빈 요청 본문 처리
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    const { sessionId, userEmail, eventType, eventData } = JSON.parse(text);

    // 제외 이메일은 데이터베이스에 저장하지 않음
    if (isEmailExcluded(userEmail)) {
      return NextResponse.json({ success: true, excluded: true });
    }

    // 중복 방지: 같은 세션, 같은 이벤트 타입, 3초 이내의 중복 이벤트는 무시
    const recentDuplicate = await sql`
      SELECT id FROM analytics_events
      WHERE session_id = ${sessionId}
        AND event_type = ${eventType}
        AND created_at > NOW() - INTERVAL '3 seconds'
      LIMIT 1
    `;

    if (recentDuplicate.length > 0) {
      console.log(`[Analytics] Duplicate event prevented: ${eventType} in session ${sessionId}`);
      return NextResponse.json({ success: true, duplicate: true });
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await sql`
      INSERT INTO analytics_events (id, session_id, user_email, event_type, event_data)
      VALUES (${eventId}, ${sessionId}, ${userEmail}, ${eventType}, ${JSON.stringify(eventData || {})})
    `;

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    );
  }
}
