import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('whop-signature');
    
    // TODO: Verify webhook signature with Whop
    // For now, we'll skip signature verification
    
    const event = JSON.parse(body);
    
    console.log('Received Whop webhook:', event.type, event.data);

    switch (event.type) {
      case 'payment_success':
        await handlePaymentSuccess(event.data);
        break;
      case 'payment_failed':
        await handlePaymentFailed(event.data);
        break;
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(data: any) {
  try {
    const { session_id, receipt_id, amount, metadata } = data;
    
    // Find the payment session
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { sessionId: session_id },
      include: { challenge: true, user: true }
    });

    if (!paymentSession) {
      console.error('Payment session not found:', session_id);
      return;
    }

    // Update payment session status
    await prisma.paymentSession.update({
      where: { id: paymentSession.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        challengeId: paymentSession.challengeId,
        userId: paymentSession.userId,
        type: 'FUNDING',
        method: 'WHOP',
        amount: paymentSession.amount,
        platformFee: paymentSession.platformFee,
        currency: paymentSession.currency,
        whopReceiptId: receipt_id,
        metadata: paymentSession.metadata,
        status: 'COMPLETED'
      }
    });

    // If this is challenge funding, update challenge status
    if (paymentSession.type === 'CHALLENGE_FUNDING' && paymentSession.challengeId) {
      await prisma.challenge.update({
        where: { id: paymentSession.challengeId },
        data: {
          status: 'FUNDED',
          isFunded: true,
          fundingMethod: 'WHOP_CHECKOUT'
        }
      });
    }

    // If this is credit deposit, update user balance
    if (paymentSession.type === 'CREDIT_DEPOSIT') {
      const user = await prisma.user.findUnique({
        where: { id: paymentSession.userId }
      });

      if (user) {
        const newBalance = user.creditBalance + paymentSession.amount;
        
        await prisma.user.update({
          where: { id: paymentSession.userId },
          data: { creditBalance: newBalance }
        });

        // Create credit transaction record
        await prisma.creditTransaction.create({
          data: {
            userId: paymentSession.userId,
            type: 'DEPOSIT',
            amount: paymentSession.amount,
            balance: newBalance,
            paymentId: payment.id,
            description: 'Credit deposit via Whop checkout'
          }
        });
      }
    }

    console.log('Payment success processed:', session_id);
  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

async function handlePaymentFailed(data: any) {
  try {
    const { session_id, error_message } = data;
    
    // Find the payment session
    const paymentSession = await prisma.paymentSession.findUnique({
      where: { sessionId: session_id }
    });

    if (!paymentSession) {
      console.error('Payment session not found:', session_id);
      return;
    }

    // Update payment session status
    await prisma.paymentSession.update({
      where: { id: paymentSession.id },
      data: {
        status: 'FAILED'
      }
    });

    // Create failed payment record
    await prisma.payment.create({
      data: {
        challengeId: paymentSession.challengeId,
        userId: paymentSession.userId,
        type: 'FUNDING',
        method: 'WHOP',
        amount: paymentSession.amount,
        platformFee: paymentSession.platformFee,
        currency: paymentSession.currency,
        metadata: {
          ...paymentSession.metadata,
          error_message
        },
        status: 'FAILED'
      }
    });

    console.log('Payment failed processed:', session_id, error_message);
  } catch (error) {
    console.error('Error processing payment failure:', error);
  }
} 