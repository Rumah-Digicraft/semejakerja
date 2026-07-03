import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type MembershipTier = 'nyantai' | 'nongkrong' | 'mode_serius';

export interface MemberProfile {
  fullName: string | null;
  avatarUrl: string | null;
  tier: MembershipTier | null;
}

/**
 * Access level for the map features (mirrors the membership pricing matrix):
 * - 'guest'  — not logged in: map + cafe names only; filters & cafe detail blurred.
 * - 'basic'  — tier Free/Nyantai (or tier unknown): map, filter parkir
 *              motor/mobil & mushola, dan di detail cafe: jam buka/tutup,
 *              rentang harga, kecepatan internet + speed test, ulasan member.
 *              Sisanya blur dengan CTA upgrade.
 * - 'full'   — tier Nongkrong / Mode Serius: everything unlocked.
 */
export type MapsAccess = 'guest' | 'basic' | 'full';

export function mapsAccess(
  user: User | null,
  tier: MembershipTier | null
): MapsAccess {
  if (!user) return 'guest';
  return tier === 'nongkrong' || tier === 'mode_serius' ? 'full' : 'basic';
}

const LANDING_URL =
  (import.meta.env.VITE_LANDING_URL as string | undefined) ??
  'https://semejakerja.pages.dev';

/**
 * Google-only user auth for the public map (minimal integration).
 * Admin auth lives in the separate semejakerja-admin app.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Profile + active membership tier (RLS: users read only their own rows)
  const { data: profile } = useQuery<MemberProfile>({
    queryKey: ['member-profile', user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [{ data: profileRow }, { data: membershipRows }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('full_name, avatar_url')
          .eq('id', user!.id)
          .maybeSingle(),
        supabase
          .from('memberships')
          .select('tier, status, expires_at')
          .eq('user_id', user!.id)
          .eq('status', 'active'),
      ]);

      // A user can have multiple 'active' rows (e.g. the default nyantai row
      // from registration plus an upgraded one) — take the highest valid tier,
      // not the newest row, so manual tier changes in admin always win.
      const TIER_RANK: Record<MembershipTier, number> = {
        nyantai: 1,
        nongkrong: 2,
        mode_serius: 3,
      };
      const tier =
        (membershipRows ?? [])
          .filter(m => !m.expires_at || new Date(m.expires_at) > new Date())
          .map(m => m.tier as MembershipTier)
          .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] ?? null;

      return {
        fullName:
          profileRow?.full_name ??
          (user!.user_metadata?.full_name as string | undefined) ??
          null,
        avatarUrl:
          profileRow?.avatar_url ??
          (user!.user_metadata?.avatar_url as string | undefined) ??
          null,
        tier,
      };
    },
  });

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    authReady,
    profile: profile ?? null,
    signIn,
    signOut,
    landingUrl: LANDING_URL,
  };
}
