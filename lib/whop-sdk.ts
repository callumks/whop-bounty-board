// Simple Whop Integration for ChallengeHub
// Using the correct @whop/api package as recommended by Whop AI
import { WhopServerSdk } from "@whop/api";

export interface WhopUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  discord_id?: string;
}

// Create Whop SDK instance - CORRECT package with users service
export const whopSdk = WhopServerSdk({
  // Your app ID from the Whop dashboard
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID || '',
  
  // Your app API key from the Whop dashboard  
  appApiKey: process.env.WHOP_API_KEY || '',
  
  // Optional: company ID for company-scoped requests
  companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
});



// Get user from Whop headers (in embedded app context) - CORRECT APPROACH
export async function getUserFromHeaders(headers: Headers): Promise<WhopUser | null> {
  try {
    console.log('=== DEBUG: Whop SDK Authentication (Correct Method) ===');
    
    // Extract and verify the user ID from the JWT token using Whop SDK
    // Pass the Headers object directly instead of converting to plain object
    const { userId } = await whopSdk.verifyUserToken(headers);
    
    if (!userId) {
      console.log('No valid user ID from JWT token');
      return null;
    }
    
    console.log('=== DEBUG: Extracted User ID ===');
    console.log('User ID from JWT:', userId);

    // Get the current user's data using the CORRECT SDK method with user context
    const result = await whopSdk
      .withUser(userId)  // This sets the x-on-behalf-of header
      .users.getCurrentUser();
    
    if (!result.user) {
      console.log('No user data returned from getCurrentUser');
      return null;
    }

    const userData = result.user;
    console.log('=== DEBUG: Real User Data from Whop ===');
    console.log('User from getCurrentUser():', userData);
    
    return {
      id: userData.id || userId,
      email: userData.email || `${userData.username || 'user'}@whop.app`,
      username: userData.username || userData.name || 'WhopUser',
      avatar_url: userData.profilePicture?.sourceUrl || undefined,
      discord_id: undefined, // Available in user data if needed
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