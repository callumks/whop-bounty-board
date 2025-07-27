export interface User {
  id: string;
  whopUserId: string;
  email: string;
  username: string;
  avatarUrl?: string;
  isCreator: boolean;
  walletAddress?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  requiredTags: string[];
  rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
  rewardAmount?: number;
  platformFee?: number;
  netPayout?: number;
  buyoutFeePaid?: boolean;
  rewardSubscriptionId?: string;
  deadline: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  whopCompanyId?: string;
  status: 'DRAFT' | 'FUNDED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  isFunded: boolean;
  totalSubmissions: number;
  approvedSubmissions: number;
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  contentUrl: string;
  contentType: 'TIKTOK' | 'TWITTER' | 'INSTAGRAM' | 'YOUTUBE' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  challengeId: string;
  userId: string;
  submissionId?: string;
  type: 'FUNDING' | 'PAYOUT';
  method: 'STRIPE' | 'CRYPTO' | 'SUBSCRIPTION';
  amount?: number;
  currency?: string;
  stripePaymentIntentId?: string;
  cryptoTransactionHash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeWithCreator extends Challenge {
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  _count?: {
    submissions: number;
  };
}

export interface SubmissionWithUser extends Submission {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  challenge: {
    id: string;
    title: string;
    rewardType: 'USD' | 'USDC' | 'SUBSCRIPTION';
    rewardAmount?: number;
  };
}

export interface CreateChallengeData {
  title: string;
  description: string;
  requiredTags: string[];
  rewardType: Challenge['rewardType'];
  rewardAmount?: number;
  rewardSubscriptionId?: string;
  deadline: string;
  visibility: Challenge['visibility'];
  whopCompanyId?: string;
}

export interface FundingData {
  challengeId: string;
  paymentMethod: 'stripe' | 'crypto';
  amount?: number;
  stripePaymentMethodId?: string;
  walletSignature?: string;
}

export interface ModerationAction {
  submissionId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
} 