export interface User {
  id: string;
  whop_user_id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_creator: boolean;
  wallet_address?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  required_tags: string[];
  reward_type: 'USD' | 'USDC' | 'SUBSCRIPTION';
  reward_amount?: number;
  reward_subscription_id?: string;
  deadline: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  whop_company_id?: string; // For private challenges
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  is_funded: boolean;
  total_submissions: number;
  approved_submissions: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  content_url: string;
  content_type: 'TIKTOK' | 'TWITTER' | 'INSTAGRAM' | 'YOUTUBE' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  paid_at?: string;
}

export interface Payment {
  id: string;
  challenge_id: string;
  user_id: string;
  submission_id?: string;
  type: 'FUNDING' | 'PAYOUT';
  method: 'STRIPE' | 'CRYPTO' | 'SUBSCRIPTION';
  amount?: number;
  currency?: string;
  stripe_payment_intent_id?: string;
  crypto_transaction_hash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithCreator extends Challenge {
  creator: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  _count?: {
    submissions: number;
  };
}

export interface SubmissionWithUser extends Submission {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  challenge: {
    id: string;
    title: string;
    reward_type: 'USD' | 'USDC' | 'SUBSCRIPTION';
    reward_amount?: number;
  };
}

export interface CreateChallengeData {
  title: string;
  description: string;
  required_tags: string[];
  reward_type: Challenge['reward_type'];
  reward_amount?: number;
  reward_subscription_id?: string;
  deadline: string;
  visibility: Challenge['visibility'];
  whop_company_id?: string;
}

export interface FundingData {
  challenge_id: string;
  payment_method: 'stripe' | 'crypto';
  amount?: number;
  stripe_payment_method_id?: string;
  wallet_signature?: string;
}

export interface ModerationAction {
  submission_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
} 