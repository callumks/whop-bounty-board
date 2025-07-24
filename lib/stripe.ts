import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default stripe;

// Create a payment intent for challenge funding
export const createFundingPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  customerId?: string
) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    metadata: {
      type: 'challenge_funding',
    },
  });

  return paymentIntent;
};

// Create a payout to creator or participant
export const createPayout = async (
  amount: number,
  stripeAccountId: string,
  currency: string = 'usd'
) => {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      destination: stripeAccountId,
      metadata: {
        type: 'challenge_payout',
      },
    });

    return transfer;
  } catch (error) {
    console.error('Payout failed:', error);
    throw error;
  }
};

// Create or retrieve Stripe customer
export const getOrCreateCustomer = async (
  email: string,
  userId: string,
  name?: string
) => {
  // First try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId,
    },
  });

  return customer;
};

// Verify webhook signature
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw error;
  }
}; 