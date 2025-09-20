import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth/server';

export async function GET(request: Request) {
  try {
    // Test if Better Auth can find the session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found',
        cookie: request.headers.get('cookie'),
      }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      cookie: request.headers.get('cookie'),
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cookie: request.headers.get('cookie'),
    }, { status: 500 });
  }
}
