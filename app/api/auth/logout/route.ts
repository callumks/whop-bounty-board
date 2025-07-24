import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
  
  // Clear session cookies
  response.cookies.delete('whop_token');
  response.cookies.delete('user_id');
  
  return response;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear session cookies
  response.cookies.delete('whop_token');
  response.cookies.delete('user_id');
  
  return response;
} 