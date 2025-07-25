// Simple Whop Integration for ChallengeHub
// Using embedded checkout approach from https://dev.whop.com/features/checkout-embed
import { WhopSDK as CoreWhopSDK } from '@whop-sdk/core';

export interface WhopUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  discord_id?: string;
}

// Create Whop SDK instance with default config
export const whopSdk = new CoreWhopSDK();



// Get user from Whop headers (in embedded app context)
export async function getUserFromHeaders(headers: Headers): Promise<WhopUser | null> {
  try {
    console.log('=== DEBUG: Whop SDK Authentication ===');
    
    // Get Whop JWT token to use as authorization
    const token = headers.get('x-whop-user-token');
    
    if (!token) {
      console.log('No x-whop-user-token found');
      return null;
    }

    // Use Whop SDK to get current user info using OAuth service
    const result = await whopSdk.oAuth.oauthInfo({
      authorization: `Bearer ${token}`
    });
    
    if (!result.user) {
      console.log('No user data returned from Whop SDK');
      return null;
    }

    const userData = result.user;
    console.log('=== DEBUG: Whop SDK User Data ===');
    console.log('User from SDK:', userData);
    
    return {
      id: userData.id || 'unknown',
      email: userData.email || `user@whop.app`,
      username: userData.username || userData.name || 'WhopUser',
      avatar_url: userData.profile_pic_url,
      discord_id: undefined, // Discord ID would be in social_accounts if needed
    };
    
  } catch (error) {
    console.error('Failed to get user from Whop SDK:', error);
    return null;
  }
}

// Get app context from headers
export function getAppContext(headers: Headers) {
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

// Create a checkout URL for challenge funding
export function createCheckoutUrl(planId: string): string {
  return `https://whop.com/checkout?plan=${planId}`;
}

// Check if user has access (simplified)
export async function checkUserAccess(userId: string, companyId?: string): Promise<boolean> {
  try {
    if (!companyId) return true; // Public challenge
    return true; // Simplified for now
  } catch (error) {
    console.error('Failed to check user access:', error);
    return false;
  }
}

// Check if user is company owner
export async function checkUserCompanyOwnership(headers: Headers): Promise<boolean> {
  try {
    const user = await getUserFromHeaders(headers);
    const appContext = getAppContext(headers);
    
    if (!user || !appContext?.companyId) {
      return false;
    }

    return await checkUserAccess(user.id, appContext.companyId);
  } catch (error) {
    console.error('Failed to check company ownership:', error);
    return false;
  }
}

// Initialize Whop checkout script (call once in your app)
export function initializeWhopCheckout(): void {
  if (typeof window !== 'undefined') {
    const existingScript = document.querySelector('script[src*="whop.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = 'https://js.whop.com/static/checkout/loader.js';
      document.head.appendChild(script);
    }
  }
}

// Simple WhopSDK class
export class WhopSDK {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Create a checkout URL for challenge funding
  public createCheckoutUrl(planId: string): string {
    return createCheckoutUrl(planId);
  }
}

// Export singleton instance
export const whopSDK = new WhopSDK(process.env.WHOP_API_KEY || '');

// Legacy exports for backward compatibility
export { WhopSDK as default }; 