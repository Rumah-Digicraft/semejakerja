import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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

export interface SubmitSpeedTestData {
  cafeId: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs?: number | null;
  userLat: number;
  userLng: number;
  distanceM: number;
  gpsAccuracyM?: number | null;
}

async function submitSpeedTest(data: SubmitSpeedTestData) {
  const { error } = await supabase.from('speed_tests').insert({
    cafe_id: data.cafeId,
    download_mbps: data.downloadMbps,
    upload_mbps: data.uploadMbps,
    latency_ms: data.latencyMs ?? null,
    user_lat: data.userLat,
    user_lng: data.userLng,
    distance_m: data.distanceM,
    gps_accuracy_m: data.gpsAccuracyM ?? null,
  });
  if (error) throw new Error(error.message);
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
// Prevents the same browser from repeatedly submitting speed tests for the
// same cafe in quick succession. Does NOT limit different users testing the
// same cafe at the same time — concurrent submissions from different people
// are legitimate signal (WiFi speed genuinely varies with concurrent load).

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_STORAGE_PREFIX = 'sk_speedtest_last_';

function getCooldownRemainingMs(cafeId: string): number {
  const raw = localStorage.getItem(COOLDOWN_STORAGE_PREFIX + cafeId);
  if (!raw) return 0;
  const remaining = COOLDOWN_MS - (Date.now() - Number(raw));
  return remaining > 0 ? remaining : 0;
}

function markCooldownStart(cafeId: string) {
  localStorage.setItem(COOLDOWN_STORAGE_PREFIX + cafeId, String(Date.now()));
}

// ── Orchestrator hook ────────────────────────────────────────────────────────

export function useSpeedTest(cafe: Cafe) {
  const [state, setState] = useState<SpeedTestState>({ status: 'idle' });
  const [cooldownMs, setCooldownMs] = useState(() => getCooldownRemainingMs(cafe.id));
  const submitMutation = useSubmitSpeedTest();
  const cafeIdRef = useRef(cafe.id);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (cafeIdRef.current !== cafe.id) {
      cafeIdRef.current = cafe.id;
      isRunningRef.current = false;
      setState({ status: 'idle' });
    }
    const tick = () => setCooldownMs(getCooldownRemainingMs(cafe.id));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cafe.id]);

  const runTest = useCallback(async () => {
    // Guards against double-click/rapid re-click firing a second test before
    // the button has re-rendered into its disabled state.
    if (isRunningRef.current) return;
    if (getCooldownRemainingMs(cafe.id) > 0) return;
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
      try {
        await submitMutation.mutateAsync({
          cafeId: cafe.id,
          downloadMbps: result.downloadMbps,
          uploadMbps: result.uploadMbps,
          latencyMs: result.latencyMs,
          userLat: latitude,
          userLng: longitude,
          distanceM,
          gpsAccuracyM: accuracy ?? null,
        });
      } catch (err) {
        setState({
          status: 'error',
          reason: { kind: 'submit-failed', message: err instanceof Error ? err.message : 'Gagal menyimpan hasil' },
        });
        return;
      }

      markCooldownStart(cafe.id);
      setCooldownMs(getCooldownRemainingMs(cafe.id));
      setState({ status: 'success', result });
    } finally {
      isRunningRef.current = false;
    }
  }, [cafe.id, cafe.lat, cafe.lng, submitMutation]);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, runTest, reset, cooldownMs };
}
