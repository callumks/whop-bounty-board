import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders, whopSdk } from '@/lib/whop-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId, amount, creatorId, description } = body;

    // Get authenticated user from Whop headers
    const whopUser = await getUserFromHeaders(request.headers);
    if (!whopUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the user exists in our local database
    const user = await prisma.user.upsert({
      where: { whopUserId: whopUser.id },
      update: {
        email: whopUser.email || '',
        username: whopUser.username || '',
        avatarUrl: whopUser.avatar_url || null,
      } as any,
      create: {
        whopUserId: whopUser.id,
        email: whopUser.email || '',
        username: whopUser.username || '',
        avatarUrl: whopUser.avatar_url || null,
        isCreator: false,
      } as any,
    });

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

    // Amount already includes platform fee from frontend
    const totalAmount = amount;
    const rewardAmount = challenge.rewardAmount;
    const platformFee = challenge.platformFee;

    try {
      // Use Whop's chargeUser API for proper payment processing  
      const amountInCents = Math.round(parseFloat(totalAmount.toFixed(2)) * 100); // Convert to cents properly
      
      console.log(`Converting $${totalAmount} to ${amountInCents} cents`); // Debug logging
      const result = await whopSdk.payments.chargeUser({
        amount: amountInCents,
        currency: "usd",
        userId: whopUser.id,
        description: description || `Challenge funding for: ${challenge.title}`,
        metadata: {
          challengeId: challengeId,
          challengeTitle: challenge.title,
          creatorId: creatorId,
          rewardAmount: `${rewardAmount}`,
          platformFee: `${platformFee}`,
          totalAmount: `${totalAmount}`,
          type: "challenge_funding",
          userId: user.id,
        },
      });

      if (result && result.status === "success") {
        // Payment completed immediately (rare case)
        return NextResponse.json({ 
          success: true, 
          status: "completed",
          message: "Payment completed successfully"
        });
      } else if (result && result.status === "needs_action" && result.inAppPurchase) {
        // Payment needs user confirmation (most common case)
        return NextResponse.json({ 
          success: true, 
          status: "needs_action",
          inAppPurchase: result.inAppPurchase,
          rewardAmount: rewardAmount,
          platformFee: platformFee,
          totalAmount: totalAmount
        });
      } else {
        console.error("Unexpected chargeUser response:", result);
        return NextResponse.json({ 
          error: "Unexpected response from payment processor" 
        }, { status: 500 });
      }
      
    } catch (whopError: any) {
      console.error("Whop chargeUser API error:", whopError);
      return NextResponse.json({ 
        error: "Failed to create charge with payment processor",
        details: whopError?.message || 'Unknown error'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 