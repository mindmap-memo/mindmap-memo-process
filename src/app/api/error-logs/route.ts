import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, componentStack, chunkFile, parsedLocation, userAgent, timestamp } = body;

    await sql`
      INSERT INTO error_logs (message, stack, component_stack, chunk_file, parsed_location, user_agent, timestamp)
      VALUES (${message}, ${stack}, ${componentStack}, ${chunkFile}, ${parsedLocation}, ${userAgent}, ${timestamp})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save error log:', error);
    return NextResponse.json(
      { error: 'Failed to save error log' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const logs = await sql`
      SELECT * FROM error_logs
      ORDER BY timestamp DESC
      LIMIT 50
    `;

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to fetch error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}
