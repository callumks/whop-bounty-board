import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('whop-signature');
    
    // Verify webhook signature
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
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
    await prisma.payment.create({
      data: {
        challengeId: paymentSession.challengeId,
        userId: paymentSession.userId,
        type: 'FUNDING',
        method: 'WHOP',
        amount: paymentSession.amount,
        platformFee: paymentSession.platformFee,
        currency: paymentSession.currency,
        whopReceiptId: receipt_id,
        metadata: paymentSession.metadata || {},
        status: 'COMPLETED'
      }
    });

    // Update challenge status to funded and then active
    await prisma.challenge.update({
      where: { id: paymentSession.challengeId },
      data: {
        status: 'FUNDED',
        isFunded: true
      }
    });

    // Immediately activate the challenge after funding
    await prisma.challenge.update({
      where: { id: paymentSession.challengeId },
      data: {
        status: 'ACTIVE'
      }
    });

    console.log('Challenge funded and activated:', paymentSession.challengeId);
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
          ...(paymentSession.metadata && typeof paymentSession.metadata === 'object' && !Array.isArray(paymentSession.metadata) ? paymentSession.metadata : {}),
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

// Verify webhook signature from Whop
function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('WHOP_WEBHOOK_SECRET environment variable not set');
      return false;
    }

    // Remove any prefix like 'sha256=' if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');
    
    // Compare signatures safely
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
} 