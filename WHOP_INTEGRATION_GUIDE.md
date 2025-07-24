# Whop Integration Setup Guide

This guide walks you through setting up real Whop SDK integration for the challenge funding system.

## 1. Environment Setup

### Required Environment Variables

Add these to your `.env.local`:

```env
# Whop Integration
WHOP_API_KEY=your_whop_api_key_here
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id_here
NEXT_PUBLIC_WHOP_APP_ID=your_app_id_here

# URLs for Whop redirects
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Database
DATABASE_URL=your_database_url_here
```

### Get Your Whop Credentials

1. **Login to Whop Developer Portal:**

   - Go to https://whop.com/apps
   - Create or select your app

2. **Get API Key:**

   - Navigate to Settings → Integration
   - Copy your API Key
   - Set as `WHOP_API_KEY`

3. **Get Webhook Secret:**

   - In Integration settings, create a webhook endpoint
   - Set URL to: `https://yourdomain.com/api/webhooks/whop`
   - Copy the webhook secret
   - Set as `WHOP_WEBHOOK_SECRET`

4. **Get Company/App IDs:**
   - Find your Company ID and App ID in the dashboard
   - Set as `NEXT_PUBLIC_WHOP_COMPANY_ID` and `NEXT_PUBLIC_WHOP_APP_ID`

## 2. Whop SDK Configuration

### Install Real Whop SDK

```bash
npm install @whop-sdk/core
```

### Update lib/whop-sdk.ts

Replace the current SDK implementation with the real Whop SDK:

```typescript
import { WhopAPI } from "@whop-sdk/core";

// Initialize Whop SDK
const whopAPI = WhopAPI({
  token: process.env.WHOP_API_KEY!,
});

export { whopAPI };
```

## 3. Webhook Configuration

### Set Up Webhook in Whop Dashboard

1. **Navigate to Webhook Settings:**

   - Go to your app settings
   - Click on "Webhooks"
   - Add new webhook endpoint

2. **Configure Webhook:**

   - **URL:** `https://yourdomain.com/api/webhooks/whop`
   - **Events:** Select these events:
     - `payment.succeeded`
     - `payment.failed`
     - `payment.canceled`
     - `membership.created`
     - `membership.updated`

3. **Test Webhook:**
   - Use Whop's webhook testing tool
   - Verify your endpoint receives events

### Update Webhook Handler

The webhook handler in `/api/webhooks/whop/route.ts` needs these improvements:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get("whop-signature") as string;

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Route events to appropriate handlers
    switch (event.type) {
      case "payment.succeeded":
        await handlePaymentSuccess(event.data);
        break;
      case "payment.failed":
        await handlePaymentFailed(event.data);
        break;
      case "payment.canceled":
        await handlePaymentCanceled(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET!;
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${computedSignature}`)
  );
}
```

## 4. Real Payment Integration

### Update Charge API

Replace simulation with real Whop payment creation:

```typescript
// In app/api/charge/route.ts
import { whopAPI } from "@/lib/whop-sdk";

// Create real payment
const payment = await whopAPI.POST("/app/payments", {
  body: {
    amount: Math.round(totalAmount * 100), // Convert to cents
    currency: "USD",
    description: `Challenge Funding: ${challenge.title}`,
    metadata: {
      challengeId: challenge.id,
      appSource: "challengehub",
      // Add other relevant metadata
    },
    success_url: `${process.env.NEXTAUTH_URL}/challenges/${challengeId}/success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/challenges/${challengeId}/cancel`,
  },
});

if (payment.error) {
  throw new Error(payment.error.message);
}

return payment.data;
```

## 5. Error Handling & Resilience

### Network Retry Logic

```typescript
class WhopAPIClient {
  private async retryRequest<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }
    throw new Error("Max retries exceeded");
  }

  async createPaymentWithRetry(paymentData: any) {
    return this.retryRequest(async () => {
      const response = await whopAPI.POST("/app/payments", {
        body: paymentData,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    });
  }
}
```

### Error Categories & Handling

```typescript
export enum ErrorCategory {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
}

export class WhopIntegrationError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = "WhopIntegrationError";
  }
}

// Usage in API routes
export function handleWhopError(error: any): NextResponse {
  if (error instanceof WhopIntegrationError) {
    return NextResponse.json(
      {
        error: error.message,
        category: error.category,
        code: "WHOP_INTEGRATION_ERROR",
      },
      { status: error.statusCode || 500 }
    );
  }

  // Handle specific Whop API errors
  if (error.response?.status === 401) {
    return NextResponse.json(
      {
        error: "Whop authentication failed",
        category: ErrorCategory.AUTHENTICATION,
      },
      { status: 401 }
    );
  }

  if (error.response?.status === 429) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        category: ErrorCategory.EXTERNAL_SERVICE,
      },
      { status: 429 }
    );
  }

  // Generic error
  return NextResponse.json(
    { error: "Internal server error", category: ErrorCategory.NETWORK },
    { status: 500 }
  );
}
```

## 6. Testing with Real Whop Environment

### Development Testing

1. **Use Whop Test Mode:**

   - Enable test mode in your Whop app settings
   - Use test API keys for development
   - Test payments won't charge real money

2. **Webhook Testing:**

   - Use ngrok to expose localhost: `ngrok http 3000`
   - Update webhook URL in Whop dashboard to ngrok URL
   - Test webhook events using Whop's webhook testing tool

3. **Payment Flow Testing:**

   ```bash
   # Test challenge creation
   curl -X POST http://localhost:3000/api/challenges \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Challenge","rewardType":"USD","rewardAmount":100}'

   # Test funding
   curl -X POST http://localhost:3000/api/charge \
     -H "Content-Type: application/json" \
     -d '{"challengeId":"challenge_id","amount":110}'
   ```

### Production Deployment

1. **Environment Setup:**

   - Use production Whop API keys
   - Set production webhook URLs
   - Enable Whop production mode

2. **Monitoring & Logging:**

   - Implement structured logging for all Whop interactions
   - Set up alerts for payment failures
   - Monitor webhook delivery success rates

3. **Security Checklist:**
   - ✅ Webhook signature verification enabled
   - ✅ API keys stored securely
   - ✅ HTTPS enabled for all endpoints
   - ✅ Rate limiting implemented
   - ✅ Input validation on all API routes

## 7. Monitoring & Observability

### Key Metrics to Track

1. **Payment Success Rate**
2. **Webhook Delivery Success Rate**
3. **Challenge Funding Completion Rate**
4. **API Response Times**
5. **Error Rates by Category**

### Logging Implementation

```typescript
import { createLogger } from "winston";

export const logger = createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "whop-integration.log" }),
  ],
});

// Usage
logger.info("Payment created", {
  challengeId,
  paymentId,
  amount,
  userId,
});

logger.error("Payment failed", {
  challengeId,
  error: error.message,
  stack: error.stack,
});
```

## 8. Troubleshooting Common Issues

### Payment Creation Fails

**Problem:** Payment creation returns 400/401 errors

**Solutions:**

1. Verify API key is correct and has payment permissions
2. Check amount is valid (> 0, proper format)
3. Validate user has access to make payments
4. Ensure metadata doesn't exceed size limits

### Webhooks Not Received

**Problem:** Webhooks aren't triggering challenge updates

**Solutions:**

1. Verify webhook URL is publicly accessible
2. Check webhook signature verification
3. Ensure webhook endpoint returns 200 status
4. Review Whop webhook delivery logs

### Challenge Status Not Updating

**Problem:** Challenges remain in DRAFT status after payment

**Solutions:**

1. Check webhook handler is processing payment.succeeded events
2. Verify payment ID mapping between Whop and local database
3. Ensure database transactions are completing successfully

## 9. Production Deployment Checklist

- [ ] Production Whop API keys configured
- [ ] Webhook endpoints accessible from internet
- [ ] SSL certificates installed and valid
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] Monitoring and logging configured
- [ ] Error alerting set up
- [ ] Payment flow tested end-to-end
- [ ] Webhook delivery verified
- [ ] Performance testing completed

## 10. Support & Resources

- **Whop Developer Docs:** https://dev.whop.com
- **Whop Discord:** Join the Whop developer community
- **API Reference:** https://dev.whop.com/api-reference
- **Webhook Documentation:** https://dev.whop.com/webhooks

For additional support, contact the Whop developer support team or check the community forums.
