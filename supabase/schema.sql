-- Create custom types
CREATE TYPE reward_type AS ENUM ('USD', 'USDC', 'SUBSCRIPTION');
CREATE TYPE challenge_visibility AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE challenge_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE submission_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE content_type AS ENUM ('TIKTOK', 'TWITTER', 'INSTAGRAM', 'YOUTUBE', 'OTHER');
CREATE TYPE payment_type AS ENUM ('FUNDING', 'PAYOUT');
CREATE TYPE payment_method AS ENUM ('STRIPE', 'CRYPTO', 'SUBSCRIPTION');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  is_creator BOOLEAN DEFAULT FALSE,
  wallet_address VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  required_tags TEXT[] DEFAULT '{}',
  reward_type reward_type NOT NULL,
  reward_amount DECIMAL(10,2),
  reward_subscription_id VARCHAR(255),
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  visibility challenge_visibility NOT NULL DEFAULT 'PUBLIC',
  whop_company_id VARCHAR(255), -- For private challenges
  status challenge_status NOT NULL DEFAULT 'DRAFT',
  is_funded BOOLEAN DEFAULT FALSE,
  total_submissions INTEGER DEFAULT 0,
  approved_submissions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_reward_amount_required CHECK (
    (reward_type IN ('USD', 'USDC') AND reward_amount IS NOT NULL) OR
    (reward_type = 'SUBSCRIPTION' AND reward_subscription_id IS NOT NULL)
  ),
  CONSTRAINT check_private_challenge_company CHECK (
    (visibility = 'PRIVATE' AND whop_company_id IS NOT NULL) OR
    (visibility = 'PUBLIC')
  )
);

-- Submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  content_type content_type NOT NULL,
  status submission_status NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint to prevent duplicate submissions
  UNIQUE(challenge_id, user_id)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  type payment_type NOT NULL,
  method payment_method NOT NULL,
  amount DECIMAL(10,2),
  currency VARCHAR(10),
  stripe_payment_intent_id VARCHAR(255),
  crypto_transaction_hash VARCHAR(255),
  status payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_challenges_creator_id ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_visibility ON challenges(visibility);
CREATE INDEX idx_challenges_deadline ON challenges(deadline);
CREATE INDEX idx_submissions_challenge_id ON submissions(challenge_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_payments_challenge_id ON payments(challenge_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Functions to update submission counts
CREATE OR REPLACE FUNCTION update_challenge_submission_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges 
    SET total_submissions = total_submissions + 1,
        updated_at = NOW()
    WHERE id = NEW.challenge_id;
    
    IF NEW.status = 'APPROVED' THEN
      UPDATE challenges 
      SET approved_submissions = approved_submissions + 1,
          updated_at = NOW()
      WHERE id = NEW.challenge_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- If status changed from non-approved to approved
    IF OLD.status != 'APPROVED' AND NEW.status = 'APPROVED' THEN
      UPDATE challenges 
      SET approved_submissions = approved_submissions + 1,
          updated_at = NOW()
      WHERE id = NEW.challenge_id;
    END IF;
    
    -- If status changed from approved to non-approved
    IF OLD.status = 'APPROVED' AND NEW.status != 'APPROVED' THEN
      UPDATE challenges 
      SET approved_submissions = approved_submissions - 1,
          updated_at = NOW()
      WHERE id = NEW.challenge_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE challenges 
    SET total_submissions = total_submissions - 1,
        updated_at = NOW()
    WHERE id = OLD.challenge_id;
    
    IF OLD.status = 'APPROVED' THEN
      UPDATE challenges 
      SET approved_submissions = approved_submissions - 1,
          updated_at = NOW()
      WHERE id = OLD.challenge_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for submission count updates
CREATE TRIGGER trigger_update_submission_counts
  AFTER INSERT OR UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_challenge_submission_counts();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = whop_user_id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = whop_user_id);

-- Anyone can view public challenges
CREATE POLICY "Anyone can view public challenges" ON challenges
  FOR SELECT USING (visibility = 'PUBLIC' AND status = 'ACTIVE');

-- Creators can view their own challenges
CREATE POLICY "Creators can view own challenges" ON challenges
  FOR SELECT USING (creator_id IN (
    SELECT id FROM users WHERE whop_user_id = auth.uid()::text
  ));

-- Creators can create challenges
CREATE POLICY "Creators can create challenges" ON challenges
  FOR INSERT WITH CHECK (creator_id IN (
    SELECT id FROM users WHERE whop_user_id = auth.uid()::text AND is_creator = true
  ));

-- Creators can update their own challenges
CREATE POLICY "Creators can update own challenges" ON challenges
  FOR UPDATE USING (creator_id IN (
    SELECT id FROM users WHERE whop_user_id = auth.uid()::text
  ));

-- Users can view submissions for challenges they can see
CREATE POLICY "Users can view relevant submissions" ON submissions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE whop_user_id = auth.uid()::text) OR
    challenge_id IN (
      SELECT id FROM challenges WHERE creator_id IN (
        SELECT id FROM users WHERE whop_user_id = auth.uid()::text
      )
    )
  );

-- Users can create submissions
CREATE POLICY "Users can create submissions" ON submissions
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE whop_user_id = auth.uid()::text
  ));

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE whop_user_id = auth.uid()::text
  ));

-- Service role can do everything (for API operations)
CREATE POLICY "Service role can do everything" ON users
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can do everything" ON challenges
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can do everything" ON submissions
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can do everything" ON payments
  FOR ALL USING (current_setting('role') = 'service_role'); 