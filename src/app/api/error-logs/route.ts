import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, componentStack, chunkFile, parsedLocation, userAgent, timestamp } = body;

    console.log('[API] Attempting to save error log:', {
      message,
      parsedLocation,
      chunkFile,
      timestamp
    });

    await sql`
      INSERT INTO error_logs (message, stack, component_stack, chunk_file, parsed_location, user_agent, timestamp)
      VALUES (${message}, ${stack}, ${componentStack}, ${chunkFile}, ${parsedLocation}, ${userAgent}, ${timestamp})
    `;

    console.log('[API] Error log saved successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('[API] Failed to save error log:', {
      error: errorMessage,
      stack: errorStack
    });

    return NextResponse.json(
      {
        error: 'Failed to save error log',
        details: errorMessage,
        stack: errorStack
      },
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
