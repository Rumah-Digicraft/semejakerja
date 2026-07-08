import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SpeedTest from '@cloudflare/speedtest';
import { supabase } from '../lib/supabaseClient';
import { haversineDistanceMeters } from '../lib/geo';
import type { Cafe } from '../types/cafe';

const MAX_DISTANCE_M = 50;

export type SpeedTestErrorReason =
  | { kind: 'permission-denied' }
  | { kind: 'position-unavailable' }
  | { kind: 'timeout' }
  | { kind: 'out-of-range'; distanceM: number; accuracyM: number | null }
  | { kind: 'speedtest-failed'; message: string }
  | { kind: 'submit-failed'; message: string };

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number | null;
}

export type SpeedTestState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'checking-distance' }
  | { status: 'testing' }
  | { status: 'submitting' }
  | { status: 'success'; result: SpeedTestResult }
  | { status: 'error'; reason: SpeedTestErrorReason };

// ── Submit ke Supabase ───────────────────────────────────────────────────────
// Nilai di-replace langsung di baris cafe lewat RPC submit_cafe_speedtest
// (SECURITY DEFINER): server yang jaga cooldown GLOBAL 10 menit per cafe &
// cek jarak ≤50 m. anon tak punya UPDATE cafes → RPC-lah gerbangnya.

export interface SubmitSpeedTestData {
  cafeId: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs?: number | null;
  distanceM: number;
}

export interface SubmitSpeedTestResult {
  ok: boolean;
  reason?: 'cooldown' | 'out_of_range' | 'not_found' | string;
  cooldown_seconds?: number;
  tested_at?: string;
}

async function submitSpeedTest(data: SubmitSpeedTestData): Promise<SubmitSpeedTestResult> {
  const { data: res, error } = await supabase.rpc('submit_cafe_speedtest', {
    p_cafe_id: data.cafeId,
    p_download: data.downloadMbps,
    p_upload: data.uploadMbps,
    p_latency: data.latencyMs ?? null,
    p_distance_m: data.distanceM,
  });
  if (error) throw new Error(error.message);
  return (res ?? { ok: false, reason: 'unknown' }) as SubmitSpeedTestResult;
}

export function useSubmitSpeedTest() {
  return useMutation({ mutationFn: submitSpeedTest });
}

// ── Cloudflare speed test ────────────────────────────────────────────────────

// Cloudflare's default measurement plan includes a WebRTC/TURN packet-loss
// phase that requires fetching TURN credentials from an endpoint that isn't
// CORS-enabled for arbitrary origins (fails on localhost and most custom
// domains). We drop that phase and keep only latency + download + upload.
const SPEEDTEST_MEASUREMENTS = [
  { type: 'latency', numPackets: 1 },
  { type: 'download', bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: 'latency', numPackets: 20 },
  { type: 'download', bytes: 1e5, count: 9 },
  { type: 'download', bytes: 1e6, count: 8 },
  { type: 'upload', bytes: 1e5, count: 8 },
  { type: 'upload', bytes: 1e6, count: 6 },
  { type: 'download', bytes: 1e7, count: 6 },
  { type: 'upload', bytes: 1e7, count: 4 },
  { type: 'download', bytes: 25e6, count: 4 },
  { type: 'upload', bytes: 25e6, count: 4 },
  { type: 'download', bytes: 1e8, count: 3 },
  { type: 'upload', bytes: 5e7, count: 3 },
  { type: 'download', bytes: 25e7, count: 2 },
] as const;

function runCloudflareSpeedTest(): Promise<SpeedTestResult> {
  return new Promise((resolve, reject) => {
    const engine = new SpeedTest({
      autoStart: true,
      measurements: [...SPEEDTEST_MEASUREMENTS],
    });

    engine.onFinish = (results) => {
      const downloadBps = results.getDownloadBandwidth();
      const uploadBps = results.getUploadBandwidth();
      resolve({
        downloadMbps: downloadBps != null ? downloadBps / 1e6 : 0,
        uploadMbps: uploadBps != null ? uploadBps / 1e6 : 0,
        latencyMs: results.getUnloadedLatency() ?? null,
      });
    };

    engine.onError = (message) => {
      reject(new Error(message || 'Speed test gagal'));
    };
  });
}

// ── Geolocation helper ───────────────────────────────────────────────────────

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 2 } as GeolocationPositionError);
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function geolocationErrorToReason(error: GeolocationPositionError): SpeedTestErrorReason {
  switch (error.code) {
    case 1:
      return { kind: 'permission-denied' };
    case 3:
      return { kind: 'timeout' };
    default:
      return { kind: 'position-unavailable' };
  }
}

// ── Cooldown (anti-spam) ─────────────────────────────────────────────────────
// Cooldown GLOBAL per cafe: begitu SIAPAPUN menjalankan tes, semua user tak
// bisa tes lagi selama 10 menit. Sumber kebenarannya `cafe.wifiTestedAt` dari
// DB (dijaga server via RPC), bukan localStorage — jadi berlaku lintas
// user/device. `justTestedAt` cuma override optimistis sampai refetch datang.

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function cooldownFromMs(testedMs: number): number {
  if (!testedMs) return 0;
  const remaining = COOLDOWN_MS - (Date.now() - testedMs);
  return remaining > 0 ? remaining : 0;
}

function parseTestedMs(wifiTestedAt: string | null, justTestedAt: number | null): number {
  return Math.max(wifiTestedAt ? Date.parse(wifiTestedAt) : 0, justTestedAt ?? 0);
}

// ── Orchestrator hook ────────────────────────────────────────────────────────

export function useSpeedTest(cafe: Cafe) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SpeedTestState>({ status: 'idle' });
  // Override optimistis: dipakai sampai refetch cafes membawa wifiTestedAt baru.
  const [justTestedAt, setJustTestedAt] = useState<number | null>(null);
  const [cooldownMs, setCooldownMs] = useState(() =>
    cooldownFromMs(parseTestedMs(cafe.wifiTestedAt, null)));
  const submitMutation = useSubmitSpeedTest();
  const cafeIdRef = useRef(cafe.id);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (cafeIdRef.current !== cafe.id) {
      cafeIdRef.current = cafe.id;
      isRunningRef.current = false;
      setJustTestedAt(null);
      setState({ status: 'idle' });
    }
    const tick = () =>
      setCooldownMs(cooldownFromMs(parseTestedMs(cafe.wifiTestedAt, justTestedAt)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cafe.id, cafe.wifiTestedAt, justTestedAt]);

  const runTest = useCallback(async () => {
    // Guards against double-click/rapid re-click firing a second test before
    // the button has re-rendered into its disabled state.
    if (isRunningRef.current) return;
    if (cooldownFromMs(parseTestedMs(cafe.wifiTestedAt, justTestedAt)) > 0) return;
    isRunningRef.current = true;

    try {
      setState({ status: 'locating' });

      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
      } catch (err) {
        setState({ status: 'error', reason: geolocationErrorToReason(err as GeolocationPositionError) });
        return;
      }

      setState({ status: 'checking-distance' });
      const { latitude, longitude, accuracy } = position.coords;
      const distanceM = haversineDistanceMeters(latitude, longitude, cafe.lat, cafe.lng);

      if (distanceM > MAX_DISTANCE_M) {
        setState({
          status: 'error',
          reason: { kind: 'out-of-range', distanceM, accuracyM: accuracy ?? null },
        });
        return;
      }

      setState({ status: 'testing' });
      let result: SpeedTestResult;
      try {
        result = await runCloudflareSpeedTest();
      } catch (err) {
        setState({
          status: 'error',
          reason: { kind: 'speedtest-failed', message: err instanceof Error ? err.message : 'Speed test gagal' },
        });
        return;
      }

      setState({ status: 'submitting' });
      let submitRes: SubmitSpeedTestResult;
      try {
        submitRes = await submitMutation.mutateAsync({
          cafeId: cafe.id,
          downloadMbps: result.downloadMbps,
          uploadMbps: result.uploadMbps,
          latencyMs: result.latencyMs,
          distanceM,
        });
      } catch (err) {
        setState({
          status: 'error',
          reason: { kind: 'submit-failed', message: err instanceof Error ? err.message : 'Gagal menyimpan hasil' },
        });
        return;
      }

      // Server menolak (mis. user lain barusan tes → cooldown, atau di luar jangkauan).
      if (!submitRes.ok) {
        queryClient.invalidateQueries({ queryKey: ['cafes'] });
        if (submitRes.reason === 'cooldown') {
          const remainMs = (submitRes.cooldown_seconds ?? COOLDOWN_MS / 1000) * 1000;
          setJustTestedAt(Date.now() - (COOLDOWN_MS - remainMs));
          setState({ status: 'idle' });
        } else if (submitRes.reason === 'out_of_range') {
          setState({ status: 'error', reason: { kind: 'out-of-range', distanceM, accuracyM: accuracy ?? null } });
        } else {
          setState({ status: 'error', reason: { kind: 'submit-failed', message: 'Gagal menyimpan hasil' } });
        }
        return;
      }

      // Sukses: nilai baru sudah di baris cafe → refetch supaya headline update.
      setJustTestedAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
      setState({ status: 'success', result });
    } finally {
      isRunningRef.current = false;
    }
  }, [cafe.id, cafe.lat, cafe.lng, cafe.wifiTestedAt, justTestedAt, submitMutation, queryClient]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, runTest, reset, cooldownMs };
}
