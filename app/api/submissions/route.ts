import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Get user's submissions with challenge details
    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
      },
      include: {
        challenge: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return NextResponse.json({ submissions });

  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { challengeId, contentUrl, contentType } = body;

    // Validate required fields
    if (!challengeId || !contentUrl || !contentType) {
      return NextResponse.json(
        { error: 'Challenge ID, content URL, and content type are required' },
        { status: 400 }
      );
    }

    // Check if challenge exists and is active
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Challenge is not active' },
        { status: 400 }
      );
    }

    // Check if user already submitted to this challenge
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: user.id,
        },
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already submitted to this challenge' },
        { status: 400 }
      );
    }

    // Create new submission
    const submission = await prisma.submission.create({
      data: {
        challengeId: String(challengeId),
        userId: user.id,
        contentUrl: String(contentUrl),
        contentType: String(contentType),
      },
      include: {
        challenge: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ submission }, { status: 201 });

  } catch (error) {
    console.error('Failed to create submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
} 