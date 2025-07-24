import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface WhopWebhookEvent {
  type: string;
  data: {
    id: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: {
      challengeId?: string;
      [key: string]: any;
    };
  };
  created_at: string;
}

interface PaymentEventData {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'canceled';
  metadata: {
    challengeId: string;
    [key: string]: any;
  };
}

class WebhookError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'WebhookError';
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.text();
    const signature = headers().get('whop-signature') as string;
    
    // Log incoming webhook for debugging
    console.log('Webhook received:', {
      signature: signature ? 'present' : 'missing',
      bodyLength: body.length,
      timestamp: new Date().toISOString()
    });

    // Verify webhook signature
    if (!signature) {
      throw new WebhookError('Missing webhook signature', 401);
    }

    if (!verifyWebhookSignature(body, signature)) {
      throw new WebhookError('Invalid webhook signature', 401);
    }

    // Parse webhook payload
    let event: WhopWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      throw new WebhookError('Invalid JSON payload', 400);
    }

    // Validate required event structure
    if (!event.type || !event.data || !event.data.id) {
      throw new WebhookError('Invalid event structure', 400);
    }

    console.log('Processing webhook event:', {
      type: event.type,
      eventId: event.data.id,
      timestamp: event.created_at
    });

    // Route events to appropriate handlers with error handling
    switch (event.type) {
      case 'payment.succeeded':
      case 'payment.completed':
        await handlePaymentSuccess(event.data as PaymentEventData);
        break;
      
      case 'payment.failed':
        await handlePaymentFailure(event.data as PaymentEventData);
        break;
        
      case 'payment.canceled':
      case 'payment.cancelled':
        await handlePaymentCanceled(event.data as PaymentEventData);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
        // Don't return error for unhandled events to avoid webhook retries
    }

    const processingTime = Date.now() - startTime;
    console.log('Webhook processed successfully:', {
      type: event.type,
      eventId: event.data.id,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({ 
      received: true, 
      event_type: event.type,
      processing_time: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error instanceof WebhookError) {
      console.error('Webhook validation error:', {
        error: error.message,
        statusCode: error.statusCode,
        processingTime: `${processingTime}ms`
      });
      
      return NextResponse.json(
        { 
          error: error.message,
          code: 'WEBHOOK_VALIDATION_ERROR',
          processing_time: processingTime
        },
        { status: error.statusCode }
      );
    }

    console.error('Webhook processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        code: 'WEBHOOK_PROCESSING_ERROR',
        processing_time: processingTime
      },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('WHOP_WEBHOOK_SECRET not configured');
      return false;
    }

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function handlePaymentSuccess(paymentData: PaymentEventData): Promise<void> {
  const { id: paymentId, metadata } = paymentData;
  
  try {
    if (!metadata?.challengeId) {
      console.warn('Payment success event missing challengeId:', paymentId);
      return;
    }

    console.log('Processing payment success:', {
      paymentId,
      challengeId: metadata.challengeId,
      amount: paymentData.amount
    });

    // Start database transaction
    await prisma.$transaction(async (tx) => {
      // Find the payment record by Whop payment ID
      const payment = await tx.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentId, // Reusing this field for Whop payment ID
          type: 'FUNDING',
        },
        include: {
          challenge: true,
        },
      });

      if (!payment) {
        throw new Error(`Payment record not found for payment ID: ${paymentId}`);
      }

      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        },
      });

      // Update all related payment records (platform fee, buyout fee)
      await tx.payment.updateMany({
        where: {
          challengeId: payment.challengeId,
          status: 'PENDING',
        },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        },
      });

      // Update challenge status to active and funded
      await tx.challenge.update({
        where: { id: payment.challengeId },
        data: {
          isFunded: true,
          status: 'ACTIVE',
          updatedAt: new Date()
        },
      });

      console.log('Challenge funded successfully:', {
        challengeId: payment.challengeId,
        paymentId,
        title: payment.challenge.title
      });
    });

  } catch (error) {
    console.error('Error handling payment success:', {
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger webhook retry
  }
}

async function handlePaymentFailure(paymentData: PaymentEventData): Promise<void> {
  const { id: paymentId, metadata } = paymentData;
  
  try {
    console.log('Processing payment failure:', {
      paymentId,
      challengeId: metadata?.challengeId
    });

    await prisma.$transaction(async (tx) => {
      // Find the payment record
      const payment = await tx.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentId,
          type: 'FUNDING',
        },
      });

      if (!payment) {
        console.warn(`Payment record not found for failed payment: ${paymentId}`);
        return;
      }

      // Update payment status to failed
      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          updatedAt: new Date()
        },
      });

      // Update all related payment records
      await tx.payment.updateMany({
        where: {
          challengeId: payment.challengeId,
          status: 'PENDING',
        },
        data: { 
          status: 'FAILED',
          updatedAt: new Date()
        },
      });

      console.log('Payment failure processed:', {
        challengeId: payment.challengeId,
        paymentId
      });
    });

  } catch (error) {
    console.error('Error handling payment failure:', {
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

async function handlePaymentCanceled(paymentData: PaymentEventData): Promise<void> {
  const { id: paymentId, metadata } = paymentData;
  
  try {
    console.log('Processing payment cancellation:', {
      paymentId,
      challengeId: metadata?.challengeId
    });

    await prisma.$transaction(async (tx) => {
      // Find the payment record
      const payment = await tx.payment.findFirst({
        where: {
          stripePaymentIntentId: paymentId,
          type: 'FUNDING',
        },
      });

      if (!payment) {
        console.warn(`Payment record not found for canceled payment: ${paymentId}`);
        return;
      }

      // Update payment status to canceled
      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'CANCELLED',
          updatedAt: new Date()
        },
      });

      // Update all related payment records
      await tx.payment.updateMany({
        where: {
          challengeId: payment.challengeId,
          status: 'PENDING',
        },
        data: { 
          status: 'CANCELLED',
          updatedAt: new Date()
        },
      });

      console.log('Payment cancellation processed:', {
        challengeId: payment.challengeId,
        paymentId
      });
    });

  } catch (error) {
    console.error('Error handling payment cancellation:', {
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
} 