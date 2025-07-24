// Whop SDK Integration for ChallengeHub
// Based on official Whop developer documentation: https://dev.whop.com/introduction

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

class WhopSDK {
  private apiKey: string;
  private baseUrl: string = 'https://api.whop.com/api/v5';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Authentication is handled by Whop when app is embedded
  // We get user info from headers/context
  static getUserFromContext(headers: Headers): WhopUser | null {
    // In a real Whop app, user info comes from headers
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
  }

  // Get user's memberships to check access
  async getUserMemberships(userId: string): Promise<WhopMembership[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/memberships`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch memberships: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get user memberships:', error);
      return [];
    }
  }

  // Check if user has access to a specific company
  async checkUserCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const memberships = await this.getUserMemberships(userId);
    return memberships.some(
      membership => membership.company_id === companyId && membership.valid
    );
  }

  // Get company information
  async getCompany(companyId: string): Promise<WhopCompany | null> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch company: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get company:', error);
      return null;
    }
  }

  // Get company plans for subscription rewards
  async getCompanyPlans(companyId: string): Promise<WhopPlan[]> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}/plans`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch plans: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
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
      const response = await fetch(`${this.baseUrl}/memberships`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          plan_id: planId,
          metadata: {
            source: 'challenge_reward',
            granted_at: new Date().toISOString(),
            ...metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create membership: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create membership:', error);
      return null;
    }
  }

  // Check if user is a creator (has companies)
  async isUserCreator(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/companies`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return (data.data && data.data.length > 0) || false;
    } catch (error) {
      console.error('Failed to check creator status:', error);
      return false;
    }
  }

  // For development/testing - create payment for challenge funding
  async createPayment(amount: number, currency: string = 'USD', metadata?: Record<string, any>) {
    // This would integrate with Whop's payment system
    // For now, return a mock payment intent
    return {
      id: `payment_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      metadata,
    };
  }
}

// Export singleton instance
export const whopSDK = new WhopSDK(process.env.WHOP_API_KEY || '');

// Helper functions
export const getUserFromHeaders = WhopSDK.getUserFromContext;

export const checkUserAccess = async (userId: string, companyId?: string): Promise<boolean> => {
  if (!companyId) return true; // Public challenge
  return whopSDK.checkUserCompanyAccess(userId, companyId);
};

export const grantSubscriptionPass = async (
  userId: string, 
  planId: string, 
  metadata?: Record<string, any>
): Promise<boolean> => {
  const membership = await whopSDK.createMembership(userId, planId, metadata);
  return membership !== null;
};

export const verifyCreatorStatus = async (userId: string): Promise<boolean> => {
  return whopSDK.isUserCreator(userId);
};

export { WhopSDK, type WhopUser, type WhopCompany, type WhopMembership, type WhopPlan }; 