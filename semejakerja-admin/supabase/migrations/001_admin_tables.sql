-- =====================================================
-- Semejakerja Admin Panel — SQL Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- ── USER PROFILES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  is_student boolean DEFAULT false,
  student_verified_at timestamptz,
  ktm_path text,
  created_at timestamptz DEFAULT now()
);

-- ── MEMBERSHIPS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('nyantai', 'nongkrong', 'mode_serius')),
  status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')) DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  promo_code_used text,
  price_paid integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── PROMO CODES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('student', 'event', 'community', 'partner')),
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  max_usage integer,
  used_count integer DEFAULT 0,
  locked_to_user_id uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES promo_codes(id),
  user_id uuid REFERENCES auth.users(id),
  membership_id uuid REFERENCES memberships(id),
  used_at timestamptz DEFAULT now()
);

-- ── SEMEJA MOVES ───────────────────────────────────────────────────────────
-- Data Moves (sessions & participants) uses tables from semejamoves-web-apps.

-- ── ADD-ON OLAHRAGA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_per_session integer NOT NULL,
  price_monthly integer NOT NULL,
  includes_equipment boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO addons (name, description, price_per_session, price_monthly, includes_equipment)
VALUES
  ('Badminton', 'Sesi badminton komunitas Semejakerja', 15000, 50000, false),
  ('Padel', 'Sesi padel komunitas Semejakerja, termasuk raket & bola', 50000, 200000, true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_id uuid REFERENCES addons(id),
  status text NOT NULL CHECK (status IN ('active','expired','cancelled')) DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  price_paid integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addon_dropin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid REFERENCES addons(id),
  user_id uuid REFERENCES auth.users(id),
  participant_name text,
  participant_wa text,
  session_date date NOT NULL,
  payment_status text NOT NULL CHECK (payment_status IN ('pending','paid','cancelled')) DEFAULT 'pending',
  price_paid integer,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── ADMIN ROLES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role text NOT NULL CHECK (role IN ('super_admin','maps_admin','community_admin','moves_admin')),
  created_at timestamptz DEFAULT now()
);

-- ── RLS POLICIES ───────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;

ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_dropin ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Admin read all (service role bypasses RLS automatically)
-- Public read for addons
CREATE POLICY "Public read addons" ON addons FOR SELECT USING (true);

-- Admin role: all authenticated users can read their own profile
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Admin roles: only service_role can manage
CREATE POLICY "Service role manages admin_roles" ON admin_roles FOR ALL USING (true);
