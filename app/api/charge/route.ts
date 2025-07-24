import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { whopSDK, getUserFromHeaders, WhopSDKError } from '@/lib/whop-sdk';
import { calculateFundingAmount } from '@/lib/platform-fee';

interface ChargeRequest {
  challengeId: string;
  userId: string;
  amount: number;
  metadata?: Record<string, any>;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' } as ErrorResponse,
        { status: 401 }
      );
    }

    const body: ChargeRequest = await request.json();
    const { challengeId, amount, metadata = {} } = body;

    // Validate request body
    if (!challengeId) {
      return NextResponse.json(
        { error: 'Challenge ID is required', code: 'MISSING_CHALLENGE_ID' } as ErrorResponse,
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
        { error: 'Challenge not found', code: 'CHALLENGE_NOT_FOUND' } as ErrorResponse,
        { status: 404 }
      );
    }

    if (challenge.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenge creator can fund this challenge', code: 'INSUFFICIENT_PERMISSIONS' } as ErrorResponse,
        { status: 403 }
      );
    }

    if (challenge.isFunded) {
      return NextResponse.json(
        { error: 'Challenge is already funded', code: 'ALREADY_FUNDED' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Get Whop user context
    const whopUser = getUserFromHeaders(request.headers);
    if (!whopUser) {
      return NextResponse.json(
        { error: 'Whop user context required', code: 'MISSING_WHOP_CONTEXT' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Handle subscription rewards differently
    if (challenge.rewardType === 'SUBSCRIPTION') {
      try {
        // For subscription rewards, validate access but no payment needed
        const hasSubscriptionAccess = await whopSDK.checkUserCompanyAccess(
          whopUser.id,
          challenge.whopCompanyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || ''
        );

        if (!hasSubscriptionAccess) {
          return NextResponse.json(
            { error: 'You do not have access to assign subscription passes for this challenge', code: 'INSUFFICIENT_SUBSCRIPTION_ACCESS' } as ErrorResponse,
            { status: 403 }
          );
        }

        // Create funding record for subscription
        const payment = await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'FUNDING',
            method: 'SUBSCRIPTION',
            amount: 0,
            currency: 'CREDITS',
            status: 'COMPLETED',
          },
        });

        // Mark challenge as funded
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: {
            isFunded: true,
            status: 'ACTIVE',
          },
        });

        return NextResponse.json({
          success: true,
          type: 'subscription',
          payment: {
            id: payment.id,
            method: 'SUBSCRIPTION',
            status: 'COMPLETED',
          },
          message: 'Challenge funded successfully with subscription credits',
        });
      } catch (error) {
        console.error('Subscription funding error:', error);
        return NextResponse.json(
          { error: 'Failed to process subscription funding', code: 'SUBSCRIPTION_FUNDING_FAILED' } as ErrorResponse,
          { status: 500 }
        );
      }
    }

    // For USD/USDC challenges, calculate total amount including platform fee
    const totalAmount = calculateFundingAmount(challenge.rewardAmount, challenge.buyoutFeePaid);

    // Prepare metadata for the Whop payment
    const paymentMetadata = {
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      rewardAmount: challenge.rewardAmount,
      platformFee: challenge.platformFee,
      buyoutFeePaid: challenge.buyoutFeePaid,
      rewardType: challenge.rewardType,
      appSource: 'challengehub',
      ...metadata,
    };

    try {
      // Create Whop payment
      const whopPayment = await whopSDK.createPayment({
        user_id: whopUser.id,
        amount: totalAmount,
        currency: 'USD',
        description: `Fund Challenge: ${challenge.title}`,
        metadata: paymentMetadata,
        return_url: `${process.env.NEXTAUTH_URL}/challenges/${challengeId}/fund/success`,
        cancel_url: `${process.env.NEXTAUTH_URL}/challenges/${challengeId}/fund/cancel`,
      });

      // Create payment record in our database
      const payment = await prisma.payment.create({
        data: {
          challengeId: challenge.id,
          userId: user.id,
          type: 'FUNDING',
          method: 'WHOP',
          amount: totalAmount,
          currency: 'USD',
          status: 'PENDING',
          // Store the Whop payment ID for tracking
          stripePaymentIntentId: whopPayment.id, // Reusing this field for Whop payment ID
        },
      });

      // Create platform fee record
      if (!challenge.buyoutFeePaid) {
        await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'PLATFORM_FEE',
            method: 'WHOP',
            amount: challenge.platformFee,
            currency: 'USD',
            status: 'PENDING',
          },
        });
      } else {
        // Create buyout fee record
        await prisma.payment.create({
          data: {
            challengeId: challenge.id,
            userId: user.id,
            type: 'BUYOUT_FEE',
            method: 'WHOP',
            amount: 25, // Buyout fee amount
            currency: 'USD',
            status: 'PENDING',
          },
        });
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: whopPayment.id,
          amount: whopPayment.amount,
          currency: whopPayment.currency,
          status: whopPayment.status,
          created_at: whopPayment.created_at,
        },
        localPayment: {
          id: payment.id,
          amount: totalAmount,
          currency: 'USD',
        },
        redirectRequired: true,
      });

    } catch (error) {
      console.error('Whop payment creation error:', error);
      
      if (error instanceof WhopSDKError) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: error.code || 'WHOP_PAYMENT_FAILED',
            details: { statusCode: error.statusCode }
          } as ErrorResponse,
          { status: error.statusCode || 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create payment session', code: 'PAYMENT_CREATION_FAILED' } as ErrorResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Charge API error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body', code: 'INVALID_JSON' } as ErrorResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse,
      { status: 500 }
    );
  }
}

// GET endpoint to check payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required', code: 'MISSING_PAYMENT_ID' } as ErrorResponse,
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' } as ErrorResponse,
        { status: 401 }
      );
    }

    try {
      // Get payment status from Whop
      const whopPayment = await whopSDK.getPayment(paymentId);
      
      // Find corresponding payment in our database
      const localPayment = await prisma.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentId, // Using this field for Whop payment ID
          userId: user.id,
        },
        include: {
          challenge: true,
        },
      });

      if (!localPayment) {
        return NextResponse.json(
          { error: 'Payment record not found', code: 'PAYMENT_NOT_FOUND' } as ErrorResponse,
          { status: 404 }
        );
      }

      // Check if payment completed and update challenge status
      if (whopPayment.status === 'completed' && localPayment.status === 'PENDING') {
        // Update payment status
        await prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: 'COMPLETED' },
        });

        // Update all related payment records
        await prisma.payment.updateMany({
          where: {
            challengeId: localPayment.challengeId,
            status: 'PENDING',
          },
          data: { status: 'COMPLETED' },
        });

        // Update challenge status
        await prisma.challenge.update({
          where: { id: localPayment.challengeId },
          data: {
            isFunded: true,
            status: 'ACTIVE',
          },
        });
      }

      return NextResponse.json({
        payment: {
          id: whopPayment.id,
          status: whopPayment.status,
          amount: whopPayment.amount,
          currency: whopPayment.currency,
          created_at: whopPayment.created_at,
          updated_at: whopPayment.updated_at,
        },
        localPayment: {
          id: localPayment.id,
          status: localPayment.status,
          challengeId: localPayment.challengeId,
        },
        challenge: {
          id: localPayment.challenge.id,
          title: localPayment.challenge.title,
          isFunded: localPayment.challenge.isFunded,
          status: localPayment.challenge.status,
        },
      });

    } catch (error) {
      console.error('Payment status check error:', error);
      
      if (error instanceof WhopSDKError) {
        return NextResponse.json(
          { 
            error: error.message, 
            code: error.code || 'PAYMENT_STATUS_FAILED',
            details: { statusCode: error.statusCode }
          } as ErrorResponse,
          { status: error.statusCode || 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to get payment status', code: 'PAYMENT_STATUS_FAILED' } as ErrorResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Payment status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' } as ErrorResponse,
      { status: 500 }
    );
  }
} 