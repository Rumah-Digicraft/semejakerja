// Deterministic cafe slugs, shared by the app router AND scripts/prerender.ts
// (which imports this file directly via Node type stripping — keep it
// dependency-free and erasable-syntax-only).

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The uuid prefix keeps slugs unique without a DB column; lookups fall back
// to matching this suffix so renamed cafes keep resolving on old URLs.
export function cafeSlug(cafe: { name: string; id: string }): string {
  return `${slugify(cafe.name)}-${cafe.id.slice(0, 8)}`;
}
