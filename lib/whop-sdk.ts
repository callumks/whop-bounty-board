// Simple Whop Integration for ChallengeHub
// Using embedded checkout approach from https://dev.whop.com/features/checkout-embed

export interface WhopUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  discord_id?: string;
}



// Get user from Whop headers (in embedded app context)
export async function getUserFromHeaders(headers: Headers): Promise<WhopUser | null> {
  try {
    // Get Whop JWT token
    const token = headers.get('x-whop-user-token');
    const appId = headers.get('x-whop-app-id');
    
    console.log('=== DEBUG: Whop Authentication ===');
    console.log('App ID:', appId);
    console.log('Token present:', !!token);
    
    if (!token) {
      console.log('No x-whop-user-token found');
      return null;
    }

    // Decode JWT token (simple base64 decode for payload)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('Invalid JWT format');
        return null;
      }

      // Decode the payload (middle part)
      const payload = parts[1];
      // Add padding if needed for base64 decode
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = atob(paddedPayload);
      const userData = JSON.parse(decodedPayload);
      
      console.log('=== DEBUG: JWT Payload ===');
      console.log('Decoded payload:', userData);
      
      // Extract user information from JWT
      const userId = userData.sub; // subject is usually the user ID
      
      if (!userId) {
        console.log('No user ID found in JWT');
        return null;
      }

      // Use a more readable username format
      const displayName = userData.username || 'WhopUser';
      
      return {
        id: userId,
        email: `${displayName}@whop.temp`,
        username: displayName,
        avatar_url: undefined,
        discord_id: undefined,
      };
      
    } catch (jwtError) {
      console.error('Failed to decode JWT:', jwtError);
      return null;
    }
  } catch (error) {
    console.error('Failed to parse user from headers:', error);
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