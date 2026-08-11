import React, { useMemo } from 'react';
import { ImageOff } from 'lucide-react';
import type { Cafe } from '../../types/cafe';

interface CafeArtPlaceholderProps {
  cafe: Cafe;
}

// No real cafe photos in the DB yet (images is always []). This renders a
// stand-in illustrated "photo" so the round card isn't a blank box — variety
// comes from the cafe's own facilities, so it's not the exact same picture
// every round. Swap this out for a real <img> once photo uploads land.
const CafeArtPlaceholder: React.FC<CafeArtPlaceholderProps> = ({ cafe }) => {
  const variant = useMemo(() => ({
    plant: cafe.facilities.outdoor,
    bicycle: cafe.facilities.motorParking,
    bunting: cafe.facilities.meetingRoom || cafe.vibes >= 4,
  }), [cafe.facilities.outdoor, cafe.facilities.motorParking, cafe.facilities.meetingRoom, cafe.vibes]);

  const w = 320, h = 190, groundY = h - 28;
  const bx = w * 0.22, bw = w * 0.56, by = h * 0.26, bh = groundY - by;
  const awY = by - 18;
  const signW = bw * 0.5, signX = bx + (bw - signW) / 2, signY = by + 9;
  const winY = signY + 28;

  return (
    <div className="relative rounded-xl overflow-hidden border border-amber-100">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width={w} height={h} fill="#F6EFE1" />
        <rect x="0" y={groundY} width={w} height={h - groundY} fill="#E4D8BE" />

        <rect x={bx} y={by} width={bw} height={bh} fill="#FBF8F1" stroke="#B8A888" strokeWidth="1.4" />

        <polygon points={`${bx - 9},${by} ${bx + bw / 2},${awY} ${bx + bw + 9},${by}`} fill="#9333ea" />
        <polygon points={`${bx + 9},${by} ${bx + bw / 2},${awY + 8} ${bx + bw - 9},${by}`} fill="#7c3aed" />

        <rect x={signX} y={signY} width={signW} height={15} rx="2" fill="#FBF8F1" stroke="#B8A888" strokeWidth="1.2" />
        <line x1={signX + 9} y1={signY + 7.5} x2={signX + signW * 0.4} y2={signY + 7.5} stroke="#B8A888" strokeWidth="2" strokeLinecap="round" />
        <line x1={signX + signW * 0.5} y1={signY + 7.5} x2={signX + signW - 9} y2={signY + 7.5} stroke="#B8A888" strokeWidth="2" strokeLinecap="round" />

        <rect x={bx + 11} y={winY} width={bw * 0.28} height={bh * 0.32} fill="#E4D8BE" stroke="#B8A888" strokeWidth="1.2" />
        <rect x={bx + bw - bw * 0.26 - 11} y={winY + 2} width={bw * 0.22} height={groundY - winY - 2} fill="#B8A888" opacity="0.8" />

        {variant.bunting && (
          <>
            <path d={`M${bx - 6},${awY - 4} Q${bx + bw / 2},${awY + 14} ${bx + bw + 6},${awY - 4}`} fill="none" stroke="#B8A888" strokeWidth="1" />
            {[1, 2, 3, 4, 5].map(i => {
              const t = i / 6;
              const bxp = (bx - 6) + (bw + 12) * t;
              const byp = (awY - 4) + 14 * 4 * t * (1 - t);
              return <circle key={i} cx={bxp} cy={byp + 4} r="2.6" fill="#fbbf24" />;
            })}
          </>
        )}

        {variant.plant && (
          <>
            <path
              d={`M${bx + bw + 15},${groundY - 30} q-10,-4 -12,-16 q12,-2 16,10 q4,-14 16,-12 q0,14 -12,18 q10,2 14,12 q-14,4 -18,-6 q-2,10 -12,10 q0,-10 8,-16z`}
              fill="#16a34a"
            />
            <path
              d={`M${bx + bw + 6},${groundY} L${bx + bw + 24},${groundY} L${bx + bw + 21},${groundY + 16} L${bx + bw + 9},${groundY + 16} Z`}
              fill="#b45309"
            />
          </>
        )}

        {variant.bicycle && (
          <g stroke="#B8A888" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <circle cx={bx - 24} cy={groundY - 2} r="9" />
            <circle cx={bx - 6} cy={groundY - 2} r="9" />
            <path d={`M${bx - 24},${groundY - 2} L${bx - 15},${groundY - 14} L${bx - 8},${groundY - 14} M${bx - 15},${groundY - 14} L${bx - 6},${groundY - 2} M${bx - 20},${groundY - 14} L${bx - 26},${groundY - 20} L${bx - 16},${groundY - 20}`} />
          </g>
        )}
      </svg>

      <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm">
        <ImageOff size={11} /> Ilustrasi — foto menyusul
      </span>
    </div>
  );
};

export default CafeArtPlaceholder;
