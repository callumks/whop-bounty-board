import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const challengeId = params.id;

    // Verify the challenge exists and user is the creator
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { creatorId: true, title: true }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can view submissions' },
        { status: 403 }
      );
    }

    // Fetch submissions for this challenge
    const submissions = await prisma.submission.findMany({
      where: { challengeId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json({
      submissions,
    });
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
} 