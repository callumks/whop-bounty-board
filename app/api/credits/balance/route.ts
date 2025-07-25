import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Whop headers
    const user = getUserFromHeaders(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { whopUserId: user.id },
      select: { 
        id: true,
        creditBalance: true,
        email: true,
        username: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      balance: dbUser.creditBalance,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username
      }
    });

  } catch (error) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      { error: 'Failed to get credit balance' },
      { status: 500 }
    );
  }
} 