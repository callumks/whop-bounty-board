import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/whop-sdk';

export async function POST(request: NextRequest) {
  try {
    const { challengeId, amount, creatorId } = await request.json();

    // Get authenticated user from Whop headers
    const user = await getUserFromHeaders(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    if (!challengeId || !amount || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: challengeId, amount, creatorId' },
        { status: 400 }
      );
    }

    // Verify the challenge exists and belongs to the creator
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        creatorId: creatorId,
        status: 'DRAFT'
      }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found or not in draft status' },
        { status: 404 }
      );
    }

    // Calculate platform fee (10%)
    const platformFeeRate = 0.10;
    const platformFee = amount * platformFeeRate;
    const totalAmount = amount + platformFee;

    // Generate unique session ID
    const timestamp = new Date().getTime();
    const randomSuffix = Math.floor(Math.random() * 1000000).toString();
    const sessionId = `ch_${timestamp}_${randomSuffix}`;
    
    // Calculate expiry time (30 minutes from now)
    const expiresAt = new Date(timestamp + 30 * 60 * 1000);

    // Create payment session in database
    const paymentSession = await prisma.paymentSession.create({
      data: {
        sessionId,
        challengeId,
        userId: user.id,
        amount,
        platformFee,
        totalAmount,
        currency: 'USD',
        metadata: {
          challengeTitle: challenge.title,
          creatorId,
          type: 'challenge_funding'
        },
        status: 'PENDING',
        expiresAt
      }
    });

    // Generate Whop checkout URL
    // In production, this would use the actual Whop API to create checkout sessions
    const checkoutUrl = `https://whop.com/checkout?session=${sessionId}&amount=${totalAmount}&currency=USD`;

    // Update payment session with checkout URL
    await prisma.paymentSession.update({
      where: { id: paymentSession.id },
      data: { checkoutUrl }
    });

    return NextResponse.json({
      sessionId,
      checkoutUrl,
      amount,
      platformFee,
      totalAmount,
      currency: 'USD'
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 