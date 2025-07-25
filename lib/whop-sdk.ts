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
export function getUserFromHeaders(headers: Headers): WhopUser | null {
  try {
    // Log all headers for debugging
    console.log('=== DEBUG: All headers received ===');
    headers.forEach((value, key) => {
      if (key.toLowerCase().includes('whop') || key.toLowerCase().includes('x-')) {
        console.log(`${key}: ${value}`);
      }
    });
    
    // Try multiple possible header formats
    const userId = headers.get('x-whop-user-id') || 
                   headers.get('whop-user-id') ||
                   headers.get('user-id');
                   
    const userEmail = headers.get('x-whop-user-email') || 
                      headers.get('whop-user-email') ||
                      headers.get('user-email');
                      
    const username = headers.get('x-whop-username') || 
                     headers.get('whop-username') ||
                     headers.get('username');
    
    console.log('=== DEBUG: Extracted values ===');
    console.log('userId:', userId);
    console.log('userEmail:', userEmail);
    console.log('username:', username);
    
    if (!userId || !userEmail || !username) {
      return null;
    }

    return {
      id: userId,
      email: userEmail,
      username: username,
      avatar_url: headers.get('x-whop-avatar-url') || 
                 headers.get('whop-avatar-url') || 
                 headers.get('avatar-url') || undefined,
      discord_id: headers.get('x-whop-discord-id') || 
                 headers.get('whop-discord-id') || 
                 headers.get('discord-id') || undefined,
    };
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
    const user = getUserFromHeaders(headers);
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