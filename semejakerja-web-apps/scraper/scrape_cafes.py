"""
Scraper Cafe Purwokerto — Google Places API
============================================
Menggunakan nearby_search + type='cafe' agar hasil terbatas pada
tempat yang dikategorikan Google sebagai Coffee Shop / Cafe,
bukan hasil teks bebas yang bisa menangkap tempat tidak relevan.

Output: cafes_purwokerto.csv  (siap di-import ke Supabase)

Install deps:
    pip install googlemaps pandas

Cara pakai:
    1. Ganti API_KEY dengan Google Maps API key kamu
    2. python scrape_cafes.py
"""

import re
import time
from datetime import datetime

import googlemaps
import pandas as pd

# ── Konfigurasi ────────────────────────────────────────────────────────────────

API_KEY = "AIza..."  # Ganti dengan API key kamu

# Titik-titik pusat pencarian (multi-titik agar coverage lebih luas)
# Purwokerto punya 4 kecamatan utama, kita cover semuanya
SEARCH_CENTERS = [
    {"label": "Purwokerto Timur",  "lat": -7.4200, "lng": 109.2490},
    {"label": "Purwokerto Barat",  "lat": -7.4220, "lng": 109.2230},
    {"label": "Purwokerto Utara",  "lat": -7.4000, "lng": 109.2430},
    {"label": "Purwokerto Selatan","lat": -7.4400, "lng": 109.2450},
    {"label": "Sokaraja",          "lat": -7.4470, "lng": 109.2760},
    {"label": "Baturaden",         "lat": -7.3400, "lng": 109.2310},
]

RADIUS_METERS = 3500   # radius per titik (overlap antar titik sengaja dibiarkan — deduplikasi di akhir)
PLACE_TYPE    = "cafe" # Google Places type: cafe = kedai kopi / kafe

# Tipe Google Places yang menyebabkan false positive — langsung skip
EXCLUDED_TYPES = {
    "lodging",       # hotel
    "hospital",      # rumah sakit
    "school",        # sekolah
    "university",    # kampus
    "gas_station",   # SPBU
    "supermarket",   # supermarket
    "convenience_store",
}

# Nama mengandung kata-kata ini → skip (case-insensitive)
EXCLUDED_NAME_KEYWORDS = [
    "hotel", "resort", "inn", "penginapan", "villa", "homestay",
    "hospital", "klinik", "apotek",
    "rs ", "rsud", "rsu ",
]

# ── Helper: parse jam buka ─────────────────────────────────────────────────────

def _to_24h(time_str: str) -> str:
    """Konversi '7:00 AM' atau '11:00 PM' ke '07:00' / '23:00'."""
    time_str = time_str.strip()
    for fmt in ("%I:%M %p", "%I %p"):
        try:
            return datetime.strptime(time_str, fmt).strftime("%H:%M")
        except ValueError:
            continue
    return time_str  # kembalikan apa adanya jika format tidak dikenali


def parse_open_hours(weekday_text: list[str] | None) -> str | None:
    """
    Ekstrak jam buka representatif dari weekday_text Google Places.
    Format output: "HH:MM - HH:MM" atau "24 Jam" atau None.

    Contoh input Google:
        ["Monday: 7:00 AM – 10:00 PM", "Tuesday: 7:00 AM – 10:00 PM", ...]
        ["Monday: Open 24 hours", ...]
        ["Monday: Closed", ...]
    """
    if not weekday_text:
        return None

    for text in weekday_text:
        lower = text.lower()

        # 24 jam
        if "open 24 hours" in lower or "24 jam" in lower:
            return "24 Jam"

        # Ekstrak rentang waktu: "7:00 AM – 10:00 PM"
        match = re.search(
            r"(\d{1,2}(?::\d{2})?\s*[AP]M)\s*[–\-]\s*(\d{1,2}(?::\d{2})?\s*[AP]M)",
            text,
            re.IGNORECASE,
        )
        if match:
            open_t  = _to_24h(match.group(1))
            close_t = _to_24h(match.group(2))
            return f"{open_t} - {close_t}"

    return None  # Closed atau format tidak dikenali


# ── Scraper utama ───────────────────────────────────────────────────────────────

def scrape():
    gmaps = googlemaps.Client(key=API_KEY)
    seen_place_ids: set[str] = set()
    rows: list[dict] = []

    for center in SEARCH_CENTERS:
        print(f"\n📍 Mencari di: {center['label']} ...")
        location = (center["lat"], center["lng"])

        result = gmaps.places_nearby(
            location=location,
            radius=RADIUS_METERS,
            type=PLACE_TYPE,
        )

        while True:
            for place in result.get("results", []):
                place_id = place["place_id"]
                if place_id in seen_place_ids:
                    continue
                seen_place_ids.add(place_id)

                # Ambil detail lengkap (tambah 'types' untuk filtering)
                detail = gmaps.place(
                    place_id=place_id,
                    fields=[
                        "name",
                        "formatted_address",
                        "geometry",
                        "rating",
                        "user_ratings_total",
                        "formatted_phone_number",
                        "website",
                        "opening_hours",
                        "price_level",
                        "reviews",
                        "types",
                    ],
                )["result"]

                # ── Filter 1: excluded Google types ──────────────────────────
                place_types = set(detail.get("types", []))
                if place_types & EXCLUDED_TYPES:
                    print(f"  ✗ SKIP (tipe {place_types & EXCLUDED_TYPES}): {detail.get('name')}")
                    continue

                # ── Filter 2: nama mengandung kata terlarang ─────────────────
                name_lower = (detail.get("name") or "").lower()
                if any(kw in name_lower for kw in EXCLUDED_NAME_KEYWORDS):
                    print(f"  ✗ SKIP (nama): {detail.get('name')}")
                    continue

                opening = detail.get("opening_hours", {})
                weekday_text_list = opening.get("weekday_text", [])

                rows.append(
                    {
                        # ── kolom utama Supabase ──
                        "name":          detail.get("name"),
                        "address":       detail.get("formatted_address"),
                        "lat":           detail["geometry"]["location"]["lat"],
                        "lng":           detail["geometry"]["location"]["lng"],
                        "rating":        detail.get("rating", 0),
                        "total_reviews": detail.get("user_ratings_total", 0),
                        "price_level":   detail.get("price_level", 0),
                        "phone":         detail.get("formatted_phone_number"),
                        "website":       detail.get("website"),
                        "is_partner":    False,
                        "discount_value": 0,
                        # ── jam buka ──
                        "open_hours":    parse_open_hours(weekday_text_list),
                        "weekday_text":  "\n".join(weekday_text_list) if weekday_text_list else None,
                        # ── review teratas ──
                        "top_review":    detail.get("reviews", [{}])[0].get("text") if detail.get("reviews") else None,
                        # ── metadata ──
                        "place_id":      place_id,
                    }
                )

                print(f"  ✓ {detail.get('name')}")

            next_token = result.get("next_page_token")
            if not next_token:
                break

            # Google mewajibkan jeda sebelum next_page_token aktif
            time.sleep(2)
            result = gmaps.places_nearby(page_token=next_token)

    # ── Simpan ke CSV ────────────────────────────────────────────────────────────
    df = pd.DataFrame(rows)

    # Filter: pastikan koordinat masih di area Banyumas (bounding box kasar)
    df = df[
        df["lat"].between(-7.60, -7.30) &
        df["lng"].between(109.10, 109.40)
    ]

    df = df.sort_values("total_reviews", ascending=False)
    df.to_csv("cafes_purwokerto.csv", index=False)
    print(f"\n✅ Selesai! {len(df)} cafe unik disimpan ke cafes_purwokerto.csv")


if __name__ == "__main__":
    scrape()
