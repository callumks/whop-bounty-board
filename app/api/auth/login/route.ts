import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  // In a real implementation, this would redirect to Whop OAuth
  // For now, we'll create a mock auth flow
  
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const whopAuthUrl = `https://whop.com/oauth/authorize?response_type=code&client_id=${process.env.NEXT_PUBLIC_WHOP_APP_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=user:read`;
  
  return NextResponse.redirect(whopAuthUrl);
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    // Exchange code for access token with Whop
    const tokenResponse = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.NEXT_PUBLIC_WHOP_APP_ID,
        client_secret: process.env.WHOP_API_KEY,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    
    // Set session cookie and redirect
    const response = NextResponse.json({ success: true });
    response.cookies.set('whop_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 400 }
    );
  }
} 