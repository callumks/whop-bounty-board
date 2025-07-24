import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { whopSDK, getUserFromHeaders } from '@/lib/whop-sdk';
import { BUYOUT_FEE_AMOUNT } from '@/lib/platform-fee';

// Get funding status for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;

    // Get challenge and verify ownership
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        payments: {
          where: {
            type: { in: ['FUNDING', 'BUYOUT_FEE', 'PLATFORM_FEE'] },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        rewardType: challenge.rewardType,
        rewardAmount: challenge.rewardAmount,
        platformFee: challenge.platformFee,
        netPayout: challenge.netPayout,
        buyoutFeePaid: challenge.buyoutFeePaid,
        rewardSubscriptionId: challenge.rewardSubscriptionId,
        isFunded: challenge.isFunded,
        status: challenge.status,
        creator: {
          id: challenge.creatorId,
          username: user.username, // From authenticated user
        },
      },
      payments: challenge.payments,
    });

  } catch (error) {
    console.error('Failed to get funding status:', error);
    return NextResponse.json(
      { error: 'Failed to get funding status' },
      { status: 500 }
    );
  }
}

// Legacy support for subscription funding (direct funding without Whop checkout)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const challengeId = params.id;
    const body = await request.json();

    // Only allow subscription funding through this endpoint
    if (body.fundingMethod !== 'subscription') {
      return NextResponse.json(
        { error: 'This endpoint only supports subscription funding. Use /api/charge for other payment methods.' },
        { status: 400 }
      );
    }

    // Get challenge and verify ownership
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        creator: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can fund this challenge' },
        { status: 403 }
      );
    }

    if (challenge.isFunded) {
      return NextResponse.json(
        { error: 'Challenge is already funded' },
        { status: 400 }
      );
    }

    if (challenge.rewardType !== 'SUBSCRIPTION') {
      return NextResponse.json(
        { error: 'This challenge requires monetary funding. Use /api/charge instead.' },
        { status: 400 }
      );
    }

    // Validate creator has subscription access/credits
    const whopUser = getUserFromHeaders(request.headers);
    if (!whopUser) {
      return NextResponse.json(
        { error: 'Whop user context required for subscription rewards' },
        { status: 400 }
      );
    }

    // Check if user has access to assign subscription passes
    const hasSubscriptionAccess = await whopSDK.checkUserCompanyAccess(
      whopUser.id,
      challenge.whopCompanyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''
    );

    if (!hasSubscriptionAccess) {
      return NextResponse.json(
        { error: 'You do not have access to assign subscription passes for this challenge' },
        { status: 403 }
      );
    }

    // Create subscription funding record
    const payment = await prisma.payment.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        type: 'FUNDING',
        method: 'SUBSCRIPTION',
        amount: 0, // No monetary cost for subscription rewards
        currency: 'CREDITS',
        status: 'COMPLETED',
      },
    });

    // Mark challenge as funded for subscription rewards
    await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        isFunded: true,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        method: 'SUBSCRIPTION',
        status: 'COMPLETED',
      },
      message: 'Challenge funded successfully with subscription credits',
    });

  } catch (error) {
    console.error('Funding error:', error);
    return NextResponse.json(
      { error: 'Failed to process funding' },
      { status: 500 }
    );
  }
} 