// Single source for the "Basecamp resmi komunitas" logos (home CafeGrid +
// /maps) AND the "Kafe Pilihan" counter in GrowthStats — edit here only.

export interface Basecamp {
  name: string;
  logo: string;
  url?: string;
}

export const basecamps: Basecamp[] = [
  { name: "Duanja", logo: "/images/kafe/duanja.png" },
  { name: "The Soeds", logo: "/images/kafe/the-soeds.png" },
  { name: "Meatboss", logo: "/images/kafe/meatboss.png" },
  { name: "Ruang Temu", logo: "/images/kafe/ruang-temu.png" },
  { name: "At Nine", logo: "/images/kafe/atnine.png" },
  { name: "Grey", logo: "/images/kafe/grey.png", url: "https://www.instagram.com/grey_cte/" },
];
