// Ported from semejamoves-web-apps/src/types/index.ts — the subset the
// public join page needs. Source of truth for the DB shape: `sessions` and
// `participants` tables (see semejakerja-admin/supabase/migrations).

export type SportType = "funminton" | "padel" | "basketball" | "volleyball";

export interface SessionSlot {
  time: string;
  courts: string;
}

export interface PollingConfig {
  enabled: boolean;
  question: string;
  options: string[];
}

export interface AnnouncementConfig {
  enabled: boolean;
  type: "next_session" | "libur" | "custom";
  title: string;
  date: string;
  caption: string;
}

export interface Session {
  id: string;
  sport_type: SportType;
  session_date: string;
  session_slots: SessionSlot[] | null;
  venue: string;
  max_participants: number;
  price_per_person: number;
  court_cost: number;
  other_cost: number;
  other_cost_description: string | null;
  notes: string | null;
  token: string;
  status: "open" | "closed" | "done";
  polling_config: PollingConfig | null;
  announcement_config: AnnouncementConfig | null;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  phone: string | null;
  attended: boolean;
  payment_status: "pending" | "approved" | "rejected";
  payment_amount: number | null;
  payment_date: string | null;
  payment_proof_url: string | null;
  ocr_raw: Record<string, unknown> | null;
  ocr_match: boolean | null;
  submitted_at: string | null;
  kritik_saran: string | null;
  polling_hari: string | null;
}
