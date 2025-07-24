import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { createFundingPaymentIntent } from '@/lib/stripe';
import { calculateFundingAmount, BUYOUT_FEE_AMOUNT } from '@/lib/platform-fee';

interface FundingRequest {
  fundingMethod: 'stripe' | 'crypto';
  walletAddress?: string; // For crypto funding
}

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
    const body: FundingRequest = await request.json();

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

    // Calculate total funding amount needed
    const totalAmount = calculateFundingAmount(challenge.rewardAmount, challenge.buyoutFeePaid);

    if (body.fundingMethod === 'stripe') {
      // Create Stripe payment intent
      const paymentIntent = await createFundingPaymentIntent(
        totalAmount,
        'usd',
        challenge.creator.stripeCustomerId || undefined
      );

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          challengeId: challenge.id,
          userId: user.id,
          type: 'FUNDING',
          method: 'STRIPE',
          amount: totalAmount,
          currency: 'USD',
          stripePaymentIntentId: paymentIntent.id,
          status: 'PENDING',
        },
      });

      // If buyout fee was paid, create separate payment record
      if (challenge.buyoutFeePaid) {
        await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'BUYOUT_FEE',
            method: 'STRIPE',
            amount: BUYOUT_FEE_AMOUNT,
            currency: 'USD',
            status: 'PENDING',
          },
        });
      } else {
        // Create platform fee payment record
        await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'PLATFORM_FEE',
            method: 'STRIPE',
            amount: challenge.platformFee,
            currency: 'USD',
            status: 'PENDING',
          },
        });
      }

      return NextResponse.json({
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
        },
        payment: {
          id: payment.id,
          amount: totalAmount,
          currency: 'USD',
        },
      });

    } else if (body.fundingMethod === 'crypto') {
      // Mock crypto funding for MVP
      if (!body.walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address is required for crypto funding' },
          { status: 400 }
        );
      }

      // Create mock crypto payment record
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      
      const payment = await prisma.payment.create({
        data: {
          challengeId: challenge.id,
          userId: user.id,
          type: 'FUNDING',
          method: 'CRYPTO',
          amount: totalAmount,
          currency: 'USDC',
          cryptoTransactionHash: mockTxHash,
          status: 'COMPLETED', // Mock as completed for MVP
        },
      });

      // Create platform fee record for crypto
      if (!challenge.buyoutFeePaid) {
        await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'PLATFORM_FEE',
            method: 'CRYPTO',
            amount: challenge.platformFee,
            currency: 'USDC',
            status: 'COMPLETED',
          },
        });
      }

      // Mark challenge as funded for crypto (since it's mocked as instant)
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          isFunded: true,
          status: 'ACTIVE',
        },
      });

      return NextResponse.json({
        payment: {
          id: payment.id,
          transactionHash: mockTxHash,
          amount: totalAmount,
          currency: 'USDC',
          status: 'COMPLETED',
        },
        message: 'Challenge funded successfully via crypto',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid funding method' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Funding error:', error);
    return NextResponse.json(
      { error: 'Failed to process funding' },
      { status: 500 }
    );
  }
}

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
        isFunded: challenge.isFunded,
        status: challenge.status,
        rewardAmount: challenge.rewardAmount,
        platformFee: challenge.platformFee,
        netPayout: challenge.netPayout,
        buyoutFeePaid: challenge.buyoutFeePaid,
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