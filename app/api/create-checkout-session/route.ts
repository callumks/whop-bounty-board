import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders } from '@/lib/whop-sdk';

export async function POST(request: NextRequest) {
  try {
    const { challengeId, amount, creatorId } = await request.json();

    // Get authenticated user from Whop headers
    const user = getUserFromHeaders(request.headers);
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

    // Create a simple session ID
    const sessionId = 'ch_' + Date.now() + '_' + (Math.random() * 1000000).toFixed(0);
    
    // Create checkout URL using the simplified whop SDK
    const checkoutUrl = `https://whop.com/checkout?plan=plan_example&amount=${totalAmount}`;

    // TODO: In a real implementation, create payment session in database
    // For now, just return the checkout information
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