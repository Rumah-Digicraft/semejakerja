import L from 'leaflet';
import type { Cafe } from '../types/cafe';

export type MarkerTier = 'basic' | 'verified' | 'partner' | 'sponsor';

const BADGE_H = 18;

interface TierConfig {
  fill: string;
  stroke: string;
  pinW: number;
  pinH: number;
  badgeText: string | null;
  badgeFontSize: number;
  hasCheckmark: boolean;
  hasStar: boolean;
  hasPulse: boolean;
  hasLabel: boolean;
  zOffset: number;
}

// Exported so the map legend can render swatches from the same colors/badges
// as the actual pins instead of a hand-maintained duplicate palette.
export const TIER_CFG: Record<MarkerTier, TierConfig> = {
  basic: {
    fill: '#B4B2A9', stroke: '#888780',
    pinW: 30, pinH: 30,
    badgeText: null, badgeFontSize: 0,
    hasCheckmark: false, hasStar: false, hasPulse: false, hasLabel: false,
    zOffset: 0,
  },
  verified: {
    fill: '#7F77DD', stroke: '#534AB7',
    pinW: 34, pinH: 34,
    // Badge text and always-on name label dropped — the legend (Info button
    // on the map) now explains what each pin color means, and the cafe name
    // shows on tap via the highlight pin instead of cluttering every marker.
    badgeText: null, badgeFontSize: 0,
    hasCheckmark: true, hasStar: false, hasPulse: false, hasLabel: false,
    zOffset: 100,
  },
  partner: {
    fill: '#1D9E75', stroke: '#0F6E56',
    pinW: 34, pinH: 34,
    badgeText: null, badgeFontSize: 0,
    // Pulse animation stays — that's what keeps mitra pins visually louder
    // than a plain colored dot even without the text badge/label.
    hasCheckmark: true, hasStar: false, hasPulse: true, hasLabel: false,
    zOffset: 200,
  },
  sponsor: {
    fill: '#EF9F27', stroke: '#BA7517',
    pinW: 40, pinH: 40,
    badgeText: null, badgeFontSize: 0,
    hasCheckmark: false, hasStar: true, hasPulse: false, hasLabel: false,
    zOffset: 300,
  },
};

function buildPinSvg(cfg: TierConfig): string {
  const { pinW: w, pinH: h, fill, stroke, hasCheckmark, hasStar } = cfg;
  // Circle sits at the top: center = (w/2, w/2), radius = w/2 - 2
  const cx = w / 2;
  const cy = cx;
  const r = cx - 2;
  const tipY = h - 1;
  // Bezier control point for the tapered sides
  const qy = +(cy + (tipY - cy) * 0.4).toFixed(1);
  const ir = +(r * 0.52).toFixed(1); // inner white circle radius

  let innerIcon: string;
  if (hasCheckmark) {
    const s = +(ir * 0.55).toFixed(1);
    innerIcon = [
      `<polyline`,
      ` points="${+(cx - +s * 1.2).toFixed(1)} ${cy}`,
      ` ${+(cx - +s * 0.1).toFixed(1)} ${+(cy + +s * 0.9).toFixed(1)}`,
      ` ${+(cx + +s * 1.1).toFixed(1)} ${+(cy - +s).toFixed(1)}"`,
      ` fill="none" stroke="${stroke}" stroke-width="2"`,
      ` stroke-linecap="round" stroke-linejoin="round"/>`,
    ].join('');
  } else if (hasStar) {
    const OR = ir * 0.88;
    const IR2 = ir * 0.40;
    const pts = Array.from({ length: 5 }, (_, i) => {
      const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = a1 + Math.PI / 5;
      return [
        `${(cx + Math.cos(a1) * OR).toFixed(1)},${(cy + Math.sin(a1) * OR).toFixed(1)}`,
        `${(cx + Math.cos(a2) * IR2).toFixed(1)},${(cy + Math.sin(a2) * IR2).toFixed(1)}`,
      ];
    }).flat().join(' ');
    innerIcon = `<polygon points="${pts}" fill="${stroke}"/>`;
  } else {
    innerIcon = `<circle cx="${cx}" cy="${cy}" r="${+(ir * 0.42).toFixed(1)}" fill="${stroke}"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<path d="M${cx} ${tipY} Q2 ${qy} 2 ${cy} A${r} ${r} 0 1 1 ${w - 2} ${cy} Q${w - 2} ${qy} ${cx} ${tipY} Z"` +
    ` fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${ir}" fill="white"/>` +
    innerIcon +
    `</svg>`
  );
}

// Simple coffee-cup glyph (body + handle + steam), drawn from scratch rather
// than tracing an icon library's bezier data — it only needs to read as "cafe"
// at marker scale, not match any particular icon set stroke-for-stroke.
function buildCoffeeGlyph(cx: number, cy: number, r: number, color: string): string {
  const bw = r * 0.85;
  const bh = r * 0.72;
  const bx = cx - bw / 2 - r * 0.08;
  const by = cy - bh / 2 + r * 0.12;
  const rx = r * 0.16;
  const sw = Math.max(1.3, r * 0.11);
  const handleW = r * 0.32;
  const handleH = bh * 0.55;
  const hx = bx + bw;
  const hy = by + (bh - handleH) / 2;
  const steamX1 = bx + bw * 0.3;
  const steamX2 = bx + bw * 0.68;
  const steamTopY = by - r * 0.1;
  const steamHeight = r * 0.32;

  return (
    `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${rx.toFixed(1)}"` +
    ` fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}"/>` +
    `<path d="M${hx.toFixed(1)} ${hy.toFixed(1)} q${handleW.toFixed(1)} 0 ${handleW.toFixed(1)} ${(handleH / 2).toFixed(1)}` +
    ` q0 ${(handleH / 2).toFixed(1)} -${handleW.toFixed(1)} ${(handleH / 2).toFixed(1)}"` +
    ` fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>` +
    `<path d="M${steamX1.toFixed(1)} ${steamTopY.toFixed(1)} q${(r * 0.1).toFixed(1)} -${(steamHeight * 0.5).toFixed(1)} 0 -${steamHeight.toFixed(1)}"` +
    ` fill="none" stroke="${color}" stroke-width="${(sw * 0.8).toFixed(1)}" stroke-linecap="round"/>` +
    `<path d="M${steamX2.toFixed(1)} ${steamTopY.toFixed(1)} q${(r * 0.1).toFixed(1)} -${(steamHeight * 0.5).toFixed(1)} 0 -${steamHeight.toFixed(1)}"` +
    ` fill="none" stroke="${color}" stroke-width="${(sw * 0.8).toFixed(1)}" stroke-linecap="round"/>`
  );
}

// Cafe pins: a plain circle (no teardrop tail — anchored at its center, not a
// tip) with a coffee-cup glyph, colored by tier. Basic tier is a white disc
// with a muted icon so it recedes; verified/partner/sponsor fill solid with a
// white icon so they pop against the basic pins around them.
function buildCoffeePinSvg(cfg: TierConfig, tier: MarkerTier): string {
  const { pinW: w, fill, stroke } = cfg;
  const cx = w / 2;
  const cy = cx;
  const r = cx - 1.5;
  const isBasic = tier === 'basic';
  const circleFill = isBasic ? '#FFFFFF' : fill;
  const iconColor = isBasic ? stroke : '#FFFFFF';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${circleFill}" stroke="${stroke}" stroke-width="2"/>` +
    buildCoffeeGlyph(cx, cy, r, iconColor) +
    `</svg>`
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getMarkerTier(cafe: Cafe): MarkerTier {
  if (cafe.category === 'sponsored') return 'sponsor';
  if (cafe.isMitraSemejaKerja) return 'partner';
  if (cafe.category === 'verified') return 'verified';
  return 'basic';
}

export function getZIndexOffset(tier: MarkerTier): number {
  return TIER_CFG[tier].zOffset;
}

// Icons are cached module-wide so every render hands react-leaflet the SAME
// instance. A new instance would trigger marker.setIcon(), which tears down
// and recreates the marker's DOM node — for ~400 markers that freezes the map
// on every interaction (filter, sidebar, modal). Only labeled tiers embed the
// cafe name, so the cache stays tiny (basic/verified are shared per tier).
const iconCache = new Map<string, L.Icon | L.DivIcon>();

export function createMarkerIcon(cafe: Cafe, tier: MarkerTier = 'basic'): L.Icon | L.DivIcon {
  const cfg = TIER_CFG[tier];
  const cacheKey = cfg.hasLabel ? `${tier}:${cafe.name}` : tier;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;
  const icon = buildIcon(cafe, cfg, tier);
  iconCache.set(cacheKey, icon);
  return icon;
}

// Blinking red pin + name label shown over the cafe currently open in the
// detail sheet (from search selection, marker tap, or a deep link) so the
// user isn't left scanning the map for which pin is theirs. Cached per cafe
// name, same reasoning as the labeled tiers in iconCache below.
const highlightIconCache = new Map<string, L.DivIcon>();

const HIGHLIGHT_CFG: TierConfig = {
  fill: '#DC2626', stroke: '#991B1B',
  pinW: 34, pinH: 44,
  badgeText: null, badgeFontSize: 0,
  hasCheckmark: false, hasStar: false, hasPulse: false, hasLabel: true,
  zOffset: 0,
};

export function createHighlightIcon(cafe: Cafe): L.DivIcon {
  const cached = highlightIconCache.get(cafe.name);
  if (cached) return cached;
  const { pinW, pinH } = HIGHLIGHT_CFG;
  const label =
    `<div style="position:absolute;top:${pinH + 4}px;left:50%;transform:translateX(-50%);` +
    `background:white;color:#1f2937;font-size:11px;font-weight:600;font-family:inherit;` +
    `padding:2px 8px;border-radius:999px;white-space:nowrap;` +
    `box-shadow:0 2px 6px rgba(0,0,0,0.18);pointer-events:none;">${cafe.name}</div>`;
  const html =
    `<div style="position:relative;width:${pinW}px;height:${pinH}px;overflow:visible;">` +
    `<div class="marker-blink">${buildPinSvg(HIGHLIGHT_CFG)}</div>` +
    label +
    `</div>`;
  const icon = L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [pinW, pinH],
    iconAnchor: [pinW / 2, pinH],
    popupAnchor: [0, -pinH],
  });
  highlightIconCache.set(cafe.name, icon);
  return icon;
}

function buildIcon(cafe: Cafe, cfg: TierConfig, tier: MarkerTier): L.Icon | L.DivIcon {
  const { pinW, badgeText, badgeFontSize, hasPulse, hasLabel, fill, stroke } = cfg;

  // Plain pins (basic tier — the vast majority) become a single <img> via an
  // SVG data URI instead of a DivIcon's nested divs: ~1 DOM node per marker
  // instead of ~4, which is what keeps pan/zoom smooth on phones.
  if (!badgeText && !hasPulse && !hasLabel) {
    return L.icon({
      iconUrl: 'data:image/svg+xml,' + encodeURIComponent(buildCoffeePinSvg(cfg, tier)),
      iconSize: [pinW, pinW],
      // Circle marker, no tail — anchor at its center, not a bottom tip.
      iconAnchor: [pinW / 2, pinW / 2],
      popupAnchor: [0, -(pinW / 2 + 4)],
    });
  }

  const hasBadge = Boolean(badgeText);
  const badgeOffset = hasBadge ? BADGE_H : 0;
  const containerH = badgeOffset + pinW;

  const badge = hasBadge
    ? `<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);` +
      `background:${stroke};color:white;font-size:${badgeFontSize}px;font-weight:700;` +
      `padding:2px 6px;border-radius:999px;white-space:nowrap;line-height:14px;` +
      `letter-spacing:0.04em;font-family:inherit;">${badgeText}</div>`
    : '';

  const pulseSize = Math.round(pinW * 1.4);
  const pulseTop = Math.round(badgeOffset + pinW / 2 - pulseSize / 2);
  const pulseLeft = Math.round(pinW / 2 - pulseSize / 2);
  const pulse = hasPulse
    ? `<div class="marker-pulse" style="position:absolute;top:${pulseTop}px;left:${pulseLeft}px;` +
      `width:${pulseSize}px;height:${pulseSize}px;border-radius:50%;background:${fill};pointer-events:none;"></div>`
    : '';

  const label = hasLabel
    ? `<div style="position:absolute;top:${containerH + 4}px;left:50%;transform:translateX(-50%);` +
      `background:white;color:#1f2937;font-size:11px;font-weight:600;font-family:inherit;` +
      `padding:2px 8px;border-radius:999px;white-space:nowrap;` +
      `box-shadow:0 2px 6px rgba(0,0,0,0.18);pointer-events:none;">${cafe.name}</div>`
    : '';

  const pinSvg = buildCoffeePinSvg(cfg, tier);

  const html =
    `<div style="position:relative;width:${pinW}px;height:${containerH}px;overflow:visible;">` +
    pulse +
    `<div style="position:absolute;top:${badgeOffset}px;left:0;">${pinSvg}</div>` +
    badge +
    label +
    `</div>`;

  return L.divIcon({
    html,
    className: 'custom-leaflet-icon',
    iconSize: [pinW, containerH],
    // Anchor at the circle's own center (it sits badgeOffset px down from the
    // container top), not the container's bottom edge — there's no tail tip
    // to anchor on anymore.
    iconAnchor: [pinW / 2, badgeOffset + pinW / 2],
    popupAnchor: [0, -(badgeOffset + pinW / 2 + 4)],
  });
}
