import { NextRequest } from 'next/server';
import { getUserFromHeaders, verifyCreatorStatus } from './whop-sdk';
import { getUserByWhopId, createUser, updateUser } from './supabase';

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
    let dbUser = await getUserByWhopId(whopUser.id);
    
    // Check if user is a creator
    const isCreator = await verifyCreatorStatus(whopUser.id);
    
    if (!dbUser) {
      // Create new user in our database
      dbUser = await createUser({
        whop_user_id: whopUser.id,
        email: whopUser.email,
        username: whopUser.username,
        avatar_url: whopUser.avatar_url,
        is_creator: isCreator,
      });
    } else {
      // Update existing user with latest info
      dbUser = await updateUser(dbUser.id, {
        email: whopUser.email,
        username: whopUser.username,
        avatar_url: whopUser.avatar_url,
        is_creator: isCreator,
      });
    }

    return {
      id: dbUser.id,
      whop_user_id: dbUser.whop_user_id,
      email: dbUser.email,
      username: dbUser.username,
      avatar_url: dbUser.avatar_url,
      is_creator: dbUser.is_creator,
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