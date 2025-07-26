// Platform fee calculation for ChallengeHub monetization

export const PLATFORM_FEE_PERCENT = 0.10; // 10%
export const MIN_PLATFORM_FEE = 2; // $2 minimum
export const BUYOUT_FEE_AMOUNT = 15; // $15 buyout fee

export interface FeeCalculation {
  rewardAmount: number;
  platformFee: number;
  netPayout: number;
  buyoutFeePaid: boolean;
  totalCost: number; // What creator pays (reward + platform fee or reward + buyout)
}

/**
 * Calculate platform fees for a challenge
 */
export function calculatePlatformFee(
  rewardAmount: number,
  buyoutFeePaid: boolean = false
): FeeCalculation {
  if (buyoutFeePaid) {
    // If creator bought out the fee, no platform fee applied
    return {
      rewardAmount,
      platformFee: 0,
      netPayout: rewardAmount,
      buyoutFeePaid: true,
      totalCost: rewardAmount + BUYOUT_FEE_AMOUNT,
    };
  }

  // Calculate standard 10% platform fee with $2 minimum
  const calculatedFee = rewardAmount * PLATFORM_FEE_PERCENT;
  const platformFee = Math.max(calculatedFee, MIN_PLATFORM_FEE);
  const netPayout = rewardAmount - platformFee;

  return {
    rewardAmount,
    platformFee,
    netPayout: rewardAmount, // Full reward goes to winner
    buyoutFeePaid: false,
    totalCost: rewardAmount + platformFee, // Creator pays reward + platform fee
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate breakdown text for UI display
 */
export function getFeeBreakdownText(calculation: FeeCalculation): string {
  if (calculation.buyoutFeePaid) {
    return `Reward: ${formatCurrency(calculation.rewardAmount)} + Buyout Fee: ${formatCurrency(BUYOUT_FEE_AMOUNT)} = Total: ${formatCurrency(calculation.totalCost)}`;
  }

  return `Reward: ${formatCurrency(calculation.rewardAmount)} → Platform Fee: ${formatCurrency(calculation.platformFee)} → Net Payout: ${formatCurrency(calculation.netPayout)}`;
}

/**
 * Validate minimum reward amount (must be at least the minimum platform fee)
 */
export function validateMinimumReward(rewardAmount: number): {
  isValid: boolean;
  message?: string;
} {
  if (rewardAmount < MIN_PLATFORM_FEE) {
    return {
      isValid: false,
      message: `Minimum reward amount is ${formatCurrency(MIN_PLATFORM_FEE)} to cover platform fees`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate total funding needed from creator
 */
export function calculateFundingAmount(
  rewardAmount: number,
  buyoutFeePaid: boolean = false
): number {
  const calculation = calculatePlatformFee(rewardAmount, buyoutFeePaid);
  return calculation.totalCost;
} 