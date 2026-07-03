import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages. No Node server at runtime, so the
  // auth gate lives client-side (see app/(dashboard)/layout.tsx) + Supabase RLS.
  // proxy.ts is intentionally absent: Proxy/Middleware is unsupported by `output: export`.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
