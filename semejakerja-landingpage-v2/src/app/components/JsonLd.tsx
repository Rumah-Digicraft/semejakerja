import type { Schema } from "@/lib/schema";

// Server component: JSON-LD ends up in the statically exported HTML.
// "<" is escaped so user-ish strings can never close the script tag.
export default function JsonLd({ data }: { data: Schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
