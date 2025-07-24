import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getWhopUser, verifyCreatorStatus } from '@/lib/whop';
import { getUserByWhopId, createUser, updateUser } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return redirect('/?error=auth_failed');
  }

  if (!code) {
    return redirect('/?error=missing_code');
  }

  try {
    // Exchange code for access token
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
    
    // Get user info from Whop
    const whopUser = await getWhopUser(tokenData.user_id);
    
    // Check if user is a creator
    const isCreator = await verifyCreatorStatus(tokenData.user_id);
    
    // Check if user exists in our database
    let user = await getUserByWhopId(tokenData.user_id);
    
    if (!user) {
      // Create new user
      user = await createUser({
        whop_user_id: tokenData.user_id,
        email: whopUser.email,
        username: whopUser.username,
        avatar_url: whopUser.profile_pic_url,
        is_creator: isCreator,
      });
    } else {
      // Update existing user
      user = await updateUser(user.id, {
        email: whopUser.email,
        username: whopUser.username,
        avatar_url: whopUser.profile_pic_url,
        is_creator: isCreator,
      });
    }

    // Create response with session
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    
    // Set session cookies
    response.cookies.set('whop_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Callback error:', error);
    return redirect('/?error=auth_failed');
  }
} 