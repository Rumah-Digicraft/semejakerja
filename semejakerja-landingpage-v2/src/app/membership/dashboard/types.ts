// Shared types + helpers for the member dashboard.
// page.tsx can't re-export these itself (App Router pages only allow the
// standard page exports), so they live here.

import type { MembershipTier } from "../features";

export type MembershipStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending_payment";

export interface UserProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  occupation: string | null;
  city: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_student: boolean;
  student_verified_at: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  tier: MembershipTier;
  status: MembershipStatus;
  started_at: string | null;
  expires_at: string | null;
  promo_code_used: string | null;
  price_paid: number | null;
  created_at: string;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
