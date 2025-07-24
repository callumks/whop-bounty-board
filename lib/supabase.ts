import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for server-side operations that need elevated permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client for Next.js app router components
export const createSupabaseClient = () => createClientComponentClient();

// Database helper functions
export const createUser = async (userData: {
  whop_user_id: string;
  email: string;
  username: string;
  avatar_url?: string;
  is_creator?: boolean;
}) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserByWhopId = async (whop_user_id: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('whop_user_id', whop_user_id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateUser = async (id: string, updates: Partial<{
  email: string;
  username: string;
  avatar_url: string;
  is_creator: boolean;
  wallet_address: string;
  stripe_customer_id: string;
}>) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}; 