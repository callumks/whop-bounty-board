import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  console.log('🔔 WEBHOOK RECEIVED - Basic request info:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    const body = await request.text();
    const signature = request.headers.get('whop-signature');
    
    console.log('🔔 WEBHOOK BODY & SIGNATURE:', {
      bodyLength: body.length,
      signature: signature,
      bodyPreview: body.substring(0, 200)
    });
    
    // Verify webhook signature
    if (!signature) {
      console.log('❌ WEBHOOK REJECTED: Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    
    if (!verifyWebhookSignature(body, signature)) {
      console.log('❌ WEBHOOK REJECTED: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(body);
    
    console.log('✅ WEBHOOK VERIFIED - Event details:', {
      type: event.type,
      data: event.data,
      fullEvent: event
    });

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
    const { receipt_id, amount, metadata, user_id } = data;
    
    console.log('Processing chargeUser payment success:', { receipt_id, amount, metadata, user_id });
    
    // For chargeUser payments, use metadata instead of session_id
    if (!metadata?.challengeId) {
      console.error('No challengeId in payment metadata:', metadata);
      return;
    }
    
    const challengeId = metadata.challengeId;
    const userId = metadata.userId || user_id;
    
    if (!userId) {
      console.error('No userId available in payment data');
      return;
    }

    // Get challenge details for platform fee calculation
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      console.error('Challenge not found:', challengeId);
      return;
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        challengeId: challengeId,
        userId: userId,
        type: 'FUNDING',
        method: 'WHOP',
        amount: challenge.rewardAmount, // Reward amount
        platformFee: challenge.platformFee, // Platform fee
        currency: challenge.rewardType === 'USDC' ? 'USDC' : 'USD',
        whopReceiptId: receipt_id,
        metadata: metadata || {},
        status: 'COMPLETED'
      }
    });

    // Update challenge status to funded and then active
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'FUNDED',
        isFunded: true
      }
    });

    // Immediately activate the challenge after funding
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'ACTIVE'
      }
    });

    console.log('Challenge funded and activated:', challengeId);
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