import { NextRequest } from 'next/server';
import { getUserFromHeaders, verifyCreatorStatus, checkUserCompanyOwnership } from './whop-sdk';
import { prisma } from './prisma';

export interface AuthenticatedUser {
  id: string; // Internal database ID
  whop_user_id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_creator: boolean;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get user from Whop headers (when app is embedded)
    const whopUser = getUserFromHeaders(request.headers);
    
    if (!whopUser) {
      return null;
    }

    // Check if user exists in our database
    let dbUser = await prisma.user.findUnique({
      where: { whopUserId: whopUser.id }
    });
    
    // Check if user is the owner of the company where this app is installed
    const isCreator = await checkUserCompanyOwnership(request.headers);
    
    if (!dbUser) {
      // Create new user in our database
      dbUser = await prisma.user.create({
        data: {
          whopUserId: whopUser.id,
          email: whopUser.email,
          username: whopUser.username,
          avatarUrl: whopUser.avatar_url,
          isCreator: isCreator,
        }
      });
    } else {
      // Update existing user with latest info
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          email: whopUser.email,
          username: whopUser.username,
          avatarUrl: whopUser.avatar_url,
          isCreator: isCreator,
        }
      });
    }

    return {
      id: dbUser.id,
      whop_user_id: dbUser.whopUserId,
      email: dbUser.email,
      username: dbUser.username,
      avatar_url: dbUser.avatarUrl || undefined,
      is_creator: dbUser.isCreator,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  };
}

export function requireCreator(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!user.is_creator) {
      return new Response(
        JSON.stringify({ error: 'Creator access required' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(request, user);
  };
} 