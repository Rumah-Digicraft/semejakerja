-- RLS Policies for self-service signup in Landing Page

-- Enable RLS (Should already be enabled, but just in case)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 1. Users can insert their own profile
CREATE POLICY "Users insert own profile" 
ON user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Users can read their own membership
CREATE POLICY "Users read own membership" 
ON memberships FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Users can insert their own membership (for checkout)
CREATE POLICY "Users insert own membership" 
ON memberships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Public can read active promo codes (for checkout validation)
CREATE POLICY "Public read active promo codes" 
ON promo_codes FOR SELECT 
USING (is_active = true);
