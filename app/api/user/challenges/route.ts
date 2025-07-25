import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Get challenges created by this user
    const challengesResult = await prisma.challenge.findMany({
      where: {
        creatorId: user.id,
      },
      include: {
        _count: {
          select: {
            submissions: true,
          }
        },
        submissions: {
          where: {
            status: {
              in: ['APPROVED', 'PAID']
            }
          },
          select: {
            id: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform the data to match the frontend interface
    const transformedChallenges = challengesResult.map((challenge: any) => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      rewardType: challenge.rewardType,
      rewardAmount: challenge.rewardAmount,
      deadline: challenge.deadline.toISOString(),
      status: challenge.status,
      isFunded: challenge.isFunded,
      totalSubmissions: challenge._count.submissions,
      approvedSubmissions: challenge.submissions.length,
      createdAt: challenge.createdAt.toISOString(),
    }));

    return NextResponse.json({ challenges: transformedChallenges });

  } catch (error) {
    console.error('Failed to fetch user challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
} 