"""
Membandingkan dua CSV cafe dan generate SQL INSERT untuk cafe yang
ada di data lama (cafes_ready_for_supabase.csv) tapi tidak ada
di data baru (cafes_purwokerto.csv) yang sudah di-import ke Supabase.

Cara pakai:
    pip install pandas
    python generate_missing_inserts.py
Output: missing_cafes_insert.sql
"""

import json
import re
import pandas as pd

OLD_CSV = "cafes_ready_for_supabase.csv"
NEW_CSV = "cafes_purwokerto.csv"
OUTPUT_SQL = "missing_cafes_insert.sql"

# ── Normalise nama untuk perbandingan ─────────────────────────────────────────

def normalise(name: str) -> str:
    """Lowercase, strip, hapus karakter non-ASCII, collapse spasi."""
    if not isinstance(name, str):
        return ""
    name = name.lower().strip()
    # Hapus karakter encoding aneh (â, Ã, ®, dll)
    name = name.encode("ascii", errors="ignore").decode()
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name)
    # Hapus tanda baca yang sering berbeda antara dua dataset
    name = re.sub(r"[®'\"&]", "", name)
    return name.strip()


# ── Parse open_hours dari weekday_text ────────────────────────────────────────

def parse_open_hours(weekday_text) -> str | None:
    """
    Coba ekstrak jam buka hari pertama dari weekday_text.
    weekday_text di data lama punya encoding rusak (â¯, â) tapi
    digit jam tetap terbaca.
    """
    if not isinstance(weekday_text, str) or not weekday_text.strip():
        return None

    # Deteksi 24 jam
    if "open 24 hours" in weekday_text.lower() or "24 jam" in weekday_text.lower():
        return "24 Jam"

    # Ambil baris pertama (hari pertama)
    first_line = weekday_text.split("\n")[0]

    # Cari pola jam: digit:digit AM/PM – digit:digit AM/PM
    # (karakter aneh di sekitar jam diabaikan)
    match = re.search(
        r"(\d{1,2}:\d{2})\s*[^\d]{0,6}(AM|PM)\s*[^\d]{1,6}\s*(\d{1,2}:\d{2})\s*[^\d]{0,6}(AM|PM)",
        first_line,
        re.IGNORECASE,
    )
    if not match:
        # Coba format tanpa menit: "12 – 10:00 PM"
        match = re.search(
            r"(\d{1,2}:\d{2})\s*[^\d]{1,6}(AM|PM)",
            first_line,
            re.IGNORECASE,
        )
        if not match:
            return None

    try:
        from datetime import datetime

        def to24(t, meridiem):
            for fmt in ("%I:%M", "%I"):
                try:
                    return datetime.strptime(f"{t} {meridiem.upper()}", f"{fmt} %p").strftime("%H:%M")
                except ValueError:
                    continue
            return t

        if len(match.groups()) == 4:
            open_t  = to24(match.group(1), match.group(2))
            close_t = to24(match.group(3), match.group(4))
            return f"{open_t} - {close_t}"
    except Exception:
        pass

    return None


# ── SQL helper ────────────────────────────────────────────────────────────────

def sql_str(val) -> str:
    """Encode nilai Python → literal SQL string atau NULL."""
    if val is None or (isinstance(val, float) and pd.isna(val)) or str(val).strip() in ("", "nan", "NaN"):
        return "NULL"
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"


def sql_jsonb_array(val) -> str:
    """Konversi weekday_text (newline-separated) → literal JSONB array atau NULL."""
    if val is None or (isinstance(val, float) and pd.isna(val)) or str(val).strip() in ("", "nan", "NaN"):
        return "NULL"
    lines = [line.strip() for line in str(val).split("\n") if line.strip()]
    if not lines:
        return "NULL"
    escaped = json.dumps(lines, ensure_ascii=False).replace("'", "''")
    return f"'{escaped}'"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    old = pd.read_csv(OLD_CSV, dtype=str)
    new = pd.read_csv(NEW_CSV, dtype=str)

    old["_norm"] = old["name"].apply(normalise)
    new["_norm"] = new["name"].apply(normalise)

    new_names = set(new["_norm"])
    missing = old[~old["_norm"].isin(new_names)].copy()

    print(f"Total cafe di data lama : {len(old)}")
    print(f"Total cafe di data baru : {len(new)}")
    print(f"Missing (perlu di-insert): {len(missing)}\n")
    for _, row in missing.iterrows():
        print(f"  • {row['name']}")

    lines = [
        "-- ============================================================",
        "-- INSERT cafe yang ada di data lama tapi tidak di data baru",
        f"-- Total: {len(missing)} cafe",
        "-- ============================================================",
        "",
        "INSERT INTO public.cafes",
        "  (id, name, address, lat, lng,",
        "   rating, total_reviews, price_level,",
        "   phone, website, is_partner, discount_value,",
        "   weekday_text, top_review, open_hours)",
        "VALUES",
    ]

    value_rows = []
    for _, row in missing.iterrows():
        open_hours = parse_open_hours(row.get("weekday_text"))
        val = (
            f"  ({sql_str(row.get('id'))},"
            f" {sql_str(row.get('name'))},"
            f" {sql_str(row.get('address'))},"
            f" {row.get('lat', 'NULL')},"
            f" {row.get('lng', 'NULL')},"
            f" {row.get('rating', 'NULL')},"
            f" {row.get('total_reviews', 'NULL')},"
            f" {row.get('price_level', '0')},"
            f" {sql_str(row.get('phone'))},"
            f" {sql_str(row.get('website'))},"
            f" {'TRUE' if str(row.get('is_partner', 'false')).lower() == 'true' else 'FALSE'},"
            f" {row.get('discount_value', '0')},"
            f" {sql_jsonb_array(row.get('weekday_text'))},"
            f" {sql_str(row.get('top_review'))},"
            f" {sql_str(open_hours)})"
        )
        value_rows.append(val)

    lines.append(",\n".join(value_rows) + ";")
    lines += [
        "",
        "-- Generate kolom location (PostGIS) dari lat/lng",
        "UPDATE public.cafes",
        "SET location = ST_GeogFromText('SRID=4326;POINT(' || lng || ' ' || lat || ')')",
        "WHERE location IS NULL;",
    ]

    sql = "\n".join(lines)
    with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"\n✅ SQL tersimpan di: {OUTPUT_SQL}")
    print("   Jalankan file ini di Supabase SQL Editor.")


if __name__ == "__main__":
    main()
