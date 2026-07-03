import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for output:"export" — renders robots.txt at build time.
export const dynamic = "force-static";

const DISALLOW = [
  "/auth/",
  "/membership/checkout",
  "/membership/dashboard",
  "/moves/join",
];

// AI/answer-engine crawlers get an explicit allow so the site can be cited
// by ChatGPT, Claude, Perplexity, etc. (GEO).
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Amazonbot",
  "Bytespider",
  "DuckAssistBot",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
