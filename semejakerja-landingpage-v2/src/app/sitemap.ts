import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Required for output:"export" — renders sitemap.xml at build time.
export const dynamic = "force-static";

const ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/maps", priority: 0.8 },
  { path: "/membership", priority: 0.8 },
  { path: "/moves", priority: 0.6 },
  { path: "/talks", priority: 0.6 },
  { path: "/english", priority: 0.6 },
  { path: "/dokumentasi", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority,
  }));
}
