import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  
  // Collect all headers
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Look specifically for Whop headers
  const whopHeaders = Object.entries(headers)
    .filter(([key]) => key.toLowerCase().includes('whop') || key.toLowerCase().includes('x-'))
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

  return NextResponse.json({
    message: 'Debug headers endpoint',
    allHeadersCount: Object.keys(headers).length,
    whopHeaders,
    allHeaders: headers, // Include all headers for debugging
    timestamp: new Date().toISOString()
  });
} 