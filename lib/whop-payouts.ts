import { whopSdk } from '@/lib/whop-sdk';
import { prisma } from '@/lib/prisma';

interface PayoutResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Pay a user using Whop's native payment system
 */
export async function payoutUSD(
  companyId: string,
  recipientUserId: string,
  amount: number,
  submissionId: string
): Promise<PayoutResult> {
  try {
    // 1. Get your company's ledger account
    const ledgerAccount = await whopSdk.companies.getCompanyLedgerAccount({
      companyId,
    });

    if (!ledgerAccount?.ledgerAccount?.id) {
      throw new Error('Company ledger account not found');
    }

    // 2. Pay the recipient
    const payment = await whopSdk.payments.payUser({
      amount: amount,
      currency: "usd",
      destinationId: recipientUserId,
      ledgerAccountId: ledgerAccount.ledgerAccount.id,
      transferFee: ledgerAccount.ledgerAccount.transferFee,
      idempotenceKey: `payout-${submissionId}-${Date.now()}`,
      reason: "bounty_payout",
      notes: `Challenge reward payout for submission ${submissionId}`,
    });

    return {
      success: true,
      transactionId: payment?.id || 'unknown',
    };
  } catch (error) {
    console.error('USD payout failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pay a user with crypto using Whop's system
 */
export async function payoutCrypto(
  companyId: string,
  recipientUserId: string,
  amount: number,
  currency: 'eth' | 'btc',
  submissionId: string
): Promise<PayoutResult> {
  try {
    const ledgerAccount = await whopSdk.companies.getCompanyLedgerAccount({
      companyId,
    });

    if (!ledgerAccount?.ledgerAccount?.id) {
      throw new Error('Company ledger account not found');
    }

    const payment = await whopSdk.payments.payUser({
      amount: amount,
      currency: currency,
      destinationId: recipientUserId,
      ledgerAccountId: ledgerAccount.ledgerAccount.id,
      transferFee: ledgerAccount.ledgerAccount.transferFee,
      idempotenceKey: `crypto-payout-${submissionId}-${Date.now()}`,
      reason: "bounty_payout",
      notes: `Challenge crypto reward payout for submission ${submissionId}`,
    });

    return {
      success: true,
      transactionId: payment.id || 'unknown',
    };
  } catch (error) {
    console.error('Crypto payout failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Grant subscription access to a user
 */
export async function grantSubscriptionAccess(
  recipientUserId: string,
  subscriptionPlanId: string,
  submissionId: string
): Promise<PayoutResult> {
  try {
    // Create a checkout session for the winner
    const checkoutSession = await whopSdk.payments.createCheckoutSession({
      planId: subscriptionPlanId,
      metadata: {
        submissionId: submissionId,
        winnerId: recipientUserId,
        reason: "challenge_reward"
      },
    });

    // TODO: Implement automatic completion logic
    // For now, we'll create a manual process
    console.log('Subscription checkout session created:', checkoutSession);

    return {
      success: true,
      transactionId: checkoutSession.id || 'unknown',
    };
  } catch (error) {
    console.error('Subscription grant failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process automatic payout when submission is approved
 */
export async function processApprovedSubmission(submissionId: string): Promise<PayoutResult> {
  try {
    // Get submission with challenge and user data
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          include: {
            creator: true,
          },
        },
        user: true,
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    const challenge = submission.challenge;
    let payoutResult: PayoutResult;

    // Process payout based on reward type
    switch (challenge.rewardType) {
      case 'USD':
        payoutResult = await payoutUSD(
          challenge.whopCompanyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || '',
          submission.user.whopUserId,
          challenge.rewardAmount,
          submissionId
        );
        break;

      case 'USDC':
        // Use ETH for now as USDC might be supported via ETH network
        payoutResult = await payoutCrypto(
          challenge.whopCompanyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || '',
          submission.user.whopUserId,
          challenge.rewardAmount,
          'eth',
          submissionId
        );
        break;

      case 'SUBSCRIPTION':
        payoutResult = await grantSubscriptionAccess(
          submission.user.whopUserId,
          challenge.rewardSubscriptionId || '',
          submissionId
        );
        break;

      default:
        throw new Error(`Unsupported reward type: ${challenge.rewardType}`);
    }

    if (payoutResult.success) {
      // Update submission status to PAID
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Record payment in database
      await prisma.payment.create({
        data: {
          challengeId: challenge.id,
          userId: submission.userId,
          submissionId: submissionId,
          type: 'PAYOUT',
          method: 'WHOP',
          amount: challenge.rewardAmount,
          currency: challenge.rewardType === 'USDC' ? 'USDC' : challenge.rewardType === 'SUBSCRIPTION' ? 'USD' : 'USD',
          metadata: {
            whopTransactionId: payoutResult.transactionId,
            rewardType: challenge.rewardType,
          },
          status: 'COMPLETED',
        },
      });

      console.log(`✅ Payout successful for submission ${submissionId}`);
    }

    return payoutResult;
  } catch (error) {
    console.error('Failed to process approved submission:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}