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

const TIER_CFG: Record<MarkerTier, TierConfig> = {
  basic: {
    fill: '#B4B2A9', stroke: '#888780',
    pinW: 28, pinH: 36,
    badgeText: null, badgeFontSize: 0,
    hasCheckmark: false, hasStar: false, hasPulse: false, hasLabel: false,
    zOffset: 0,
  },
  verified: {
    fill: '#7F77DD', stroke: '#534AB7',
    pinW: 34, pinH: 44,
    badgeText: 'SK', badgeFontSize: 10,
    hasCheckmark: true, hasStar: false, hasPulse: false, hasLabel: false,
    zOffset: 100,
  },
  partner: {
    fill: '#1D9E75', stroke: '#0F6E56',
    pinW: 34, pinH: 44,
    badgeText: 'MITRA', badgeFontSize: 9,
    hasCheckmark: true, hasStar: false, hasPulse: true, hasLabel: false,
    zOffset: 200,
  },
  sponsor: {
    fill: '#EF9F27', stroke: '#BA7517',
    pinW: 42, pinH: 54,
    badgeText: 'SPONSOR', badgeFontSize: 9,
    hasCheckmark: false, hasStar: true, hasPulse: false, hasLabel: true,
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

  let innerIcon = '';
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

export function createMarkerIcon(cafe: Cafe, tier: MarkerTier = 'basic'): L.DivIcon {
  const cfg = TIER_CFG[tier];
  const { pinW, pinH, badgeText, badgeFontSize, hasPulse, hasLabel, fill, stroke } = cfg;

  const hasBadge = Boolean(badgeText);
  const badgeOffset = hasBadge ? BADGE_H : 0;
  const containerH = badgeOffset + pinH;

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

  const pinSvg = buildPinSvg(cfg);

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
    iconAnchor: [pinW / 2, containerH],
    popupAnchor: [0, -pinH],
  });
}
