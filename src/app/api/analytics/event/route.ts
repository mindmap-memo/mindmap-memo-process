import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

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
