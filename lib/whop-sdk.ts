// Whop SDK Integration for ChallengeHub
// Based on official Whop developer documentation: https://dev.whop.com/

import { WhopAPI } from '@whop-sdk/core';

interface WhopUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  discord_id?: string;
}

interface WhopCompany {
  id: string;
  name: string;
  vanity: string;
  image_url?: string;
}

interface WhopMembership {
  id: string;
  user_id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  valid: boolean;
}

interface WhopPlan {
  id: string;
  company_id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'lifetime';
}

interface WhopPayment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'canceled';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CreatePaymentRequest {
  user_id: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
  return_url?: string;
orking with   cancel_url?: string;
}

class WhopSDKError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'WhopSDKError';
  }
}

class WhopSDK {
  private apiKey: string;
  private whopAPI: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.whopAPI = WhopAPI({
      token: apiKey,
    });
  }

  // Get user from Whop headers in embedded app context
  static getUserFromHeaders(headers: Headers): WhopUser | null {
    try {
      const userId = headers.get('x-whop-user-id');
      const userEmail = headers.get('x-whop-user-email');
      const username = headers.get('x-whop-username');
      
      if (!userId || !userEmail || !username) {
        return null;
      }

      return {
        id: userId,
        email: userEmail,
        username: username,
        avatar_url: headers.get('x-whop-avatar-url') || undefined,
        discord_id: headers.get('x-whop-discord-id') || undefined,
      };
    } catch (error) {
      console.error('Failed to parse user from headers:', error);
      return null;
    }
  }

  // Get app context from headers (company where app is installed)
  static getAppContext(headers: Headers): { companyId?: string } | null {
    try {
      const companyId = headers.get('x-whop-company-id') || 
                       headers.get('x-whop-app-company-id') ||
                       process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
      
      return {
        companyId: companyId || undefined,
      };
    } catch (error) {
      console.error('Failed to get app context:', error);
      return null;
    }
  }

  // Create a payment for challenge funding
  async createPayment(request: CreatePaymentRequest): Promise<WhopPayment> {
    try {
      if (!request.user_id) {
        throw new WhopSDKError('User ID is required', 400, 'MISSING_USER_ID');
      }

      if (!request.amount || request.amount <= 0) {
        throw new WhopSDKError('Valid amount is required', 400, 'INVALID_AMOUNT');
      }

      const response = await this.whopAPI.POST('/app/payments', {
        body: {
          user_id: request.user_id,
          amount: Math.round(request.amount * 100), // Convert to cents
          currency: request.currency || 'USD',
          description: request.description || 'Challenge funding',
          metadata: {
            source: 'challenge_funding',
            timestamp: new Date().toISOString(),
            ...request.metadata,
          },
          return_url: request.return_url,
          cancel_url: request.cancel_url,
        },
      });

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to create payment',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to create payment:', error);
      throw new WhopSDKError('Payment creation failed', 500, 'PAYMENT_CREATION_FAILED');
    }
  }

  // Get payment status
  async getPayment(paymentId: string): Promise<WhopPayment> {
    try {
      if (!paymentId) {
        throw new WhopSDKError('Payment ID is required', 400, 'MISSING_PAYMENT_ID');
      }

      const response = await this.whopAPI.GET(`/app/payments/${paymentId}`);

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to get payment',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to get payment:', error);
      throw new WhopSDKError('Payment retrieval failed', 500, 'PAYMENT_RETRIEVAL_FAILED');
    }
  }

  // Confirm payment completion (if needed)
  async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      if (!paymentId) {
        throw new WhopSDKError('Payment ID is required', 400, 'MISSING_PAYMENT_ID');
      }

      const response = await this.whopAPI.POST(`/app/payments/${paymentId}/confirm`);

      return !response.error;
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      return false;
    }
  }

  // Get user's memberships to check access
  async getUserMemberships(userId: string): Promise<WhopMembership[]> {
    try {
      if (!userId) {
        throw new WhopSDKError('User ID is required', 400, 'MISSING_USER_ID');
      }

      const response = await this.whopAPI.GET(`/app/users/${userId}/memberships`);

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to fetch memberships',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data || [];
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to get user memberships:', error);
      return [];
    }
  }

  // Check if user has access to a specific company
  async checkUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    try {
      const memberships = await this.getUserMemberships(userId);
      return memberships.some(
        membership => membership.company_id === companyId && membership.valid
      );
    } catch (error) {
      console.error('Failed to check company access:', error);
      return false;
    }
  }

  // Get company information
  async getCompany(companyId: string): Promise<WhopCompany | null> {
    try {
      if (!companyId) {
        throw new WhopSDKError('Company ID is required', 400, 'MISSING_COMPANY_ID');
      }

      const response = await this.whopAPI.GET(`/app/companies/${companyId}`);

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to fetch company',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to get company:', error);
      return null;
    }
  }

  // Get company plans for subscription rewards
  async getCompanyPlans(companyId: string): Promise<WhopPlan[]> {
    try {
      if (!companyId) {
        throw new WhopSDKError('Company ID is required', 400, 'MISSING_COMPANY_ID');
      }

      const response = await this.whopAPI.GET(`/app/companies/${companyId}/plans`);

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to fetch plans',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data || [];
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to get company plans:', error);
      return [];
    }
  }

  // Create membership (for subscription pass rewards)
  async createMembership(
    userId: string, 
    planId: string, 
    metadata?: Record<string, any>
  ): Promise<WhopMembership | null> {
    try {
      if (!userId || !planId) {
        throw new WhopSDKError('User ID and Plan ID are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      const response = await this.whopAPI.POST('/app/memberships', {
        body: {
          user_id: userId,
          plan_id: planId,
          metadata: {
            source: 'challenge_reward',
            granted_at: new Date().toISOString(),
            ...metadata,
          },
        },
      });

      if (response.error) {
        throw new WhopSDKError(
          response.error.message || 'Failed to create membership',
          response.error.status || 500,
          response.error.code
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof WhopSDKError) {
        throw error;
      }
      console.error('Failed to create membership:', error);
      return null;
    }
  }

  // Check if user is a creator (has companies)
  async isUserCreator(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        return false;
      }

      const response = await this.whopAPI.GET(`/app/users/${userId}/companies`);

      if (response.error) {
        return false;
      }

      return (response.data && response.data.length > 0) || false;
    } catch (error) {
      console.error('Failed to check creator status:', error);
      return false;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Implement Whop's webhook signature validation
      // This is a placeholder - implement according to Whop's docs
      const crypto = require('crypto');
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const whopSDK = new WhopSDK(process.env.WHOP_API_KEY || '');

// Helper functions
export const getUserFromHeaders = WhopSDK.getUserFromHeaders;

export const checkUserAccess = async (userId: string, companyId?: string): Promise<boolean> => {
  try {
    if (!companyId) return true; // Public challenge
    return await whopSDK.checkUserCompanyAccess(userId, companyId);
  } catch (error) {
    console.error('Failed to check user access:', error);
    return false;
  }
};

export const grantSubscriptionPass = async (
  userId: string, 
  planId: string, 
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    const membership = await whopSDK.createMembership(userId, planId, metadata);
    return membership !== null;
  } catch (error) {
    console.error('Failed to grant subscription pass:', error);
    return false;
  }
};

// Check if user is the owner of the company where this app is installed
export const checkUserCompanyOwnership = async (headers: Headers): Promise<boolean> => {
  try {
    const user = WhopSDK.getUserFromHeaders(headers);
    const appContext = WhopSDK.getAppContext(headers);
    
    if (!user || !appContext?.companyId) {
      return false;
    }

    const isOwner = await whopSDK.checkUserCompanyAccess(user.id, appContext.companyId);
    return isOwner;
  } catch (error) {
    console.error('Failed to check company ownership:', error);
    return false;
  }
};

export const verifyCreatorStatus = async (userId: string): Promise<boolean> => {
  try {
    return await whopSDK.isUserCreator(userId);
  } catch (error) {
    console.error('Failed to verify creator status:', error);
    return false;
  }
};

export { 
  WhopSDK, 
  WhopSDKError,
  type WhopUser, 
  type WhopCompany, 
  type WhopMembership, 
  type WhopPlan,
  type WhopPayment,
  type CreatePaymentRequest
}; 