import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

// Prevent prerendering - this route uses dynamic headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In the response, is_creator indicates if user is a Whop company owner
    // (where this app is installed), not just any creator
    console.log('=== DEBUG: /api/user/status response ===');
    console.log('User avatarUrl from DB:', user.avatarUrl);
    console.log('Full user object:', user);

    return NextResponse.json({
      user: {
        id: user.id,
        whopUserId: user.whopUserId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        is_whop_owner: user.isCreator, // This is now checking company ownership
      }
    });

  } catch (error) {
    console.error('Failed to get user status:', error);
    return NextResponse.json(
      { error: 'Failed to get user status' },
      { status: 500 }
    );
  }
} 