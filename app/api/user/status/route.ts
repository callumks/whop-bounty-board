import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

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
    return NextResponse.json({
      user: {
        id: user.id,
        whop_user_id: user.whop_user_id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        is_whop_owner: user.is_creator, // This is now checking company ownership
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