// deno test --allow-env supabase/functions/resolve-maps-link/index.test.ts
//
// Tidak memanggil Google beneran (lambat, flaky, dan berbayar untuk Places
// API) — `fetch` di-stub per test dengan respons tiruan yang bentuknya
// meniru persis apa yang sudah dites manual lewat curl terhadap link asli
// (lihat komentar di index.ts). Yang diverifikasi adalah LOGIKA-nya: parsing
// URL, prioritas ekstraksi koordinat, jalur fallback CID->Places API, dan
// pemetaan error — bukan availability/biaya layanan pihak ketiga.

import { handleRequest } from "./index.ts";

// Assert kecil sendiri, bukan jsr:@std/assert — sandbox test ini tidak selalu
// punya akses jaringan ke jsr.io, dan cuma butuh dua assertion sederhana.
function assertEquals<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg ?? `assertEquals failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertMatch(actual: string, pattern: RegExp) {
  if (!pattern.test(actual)) {
    throw new Error(`assertMatch failed: ${JSON.stringify(actual)} does not match ${pattern}`);
  }
}

// Contoh nyata dari tugas: dua link share (web & mobile) untuk cafe yang
// sama, "Iga Sapi Merdeka" di Purwokerto.
const WEB_SHORT_URL = "https://maps.app.goo.gl/M2EEHqypHegCr4D8A";
const MOBILE_SHORT_URL = "https://maps.app.goo.gl/ovrw2pixpQSZQqdC8";
const CID = "0x2e655f100d99f56f:0x2f824a292e2a0db2";
const EXPECTED_LAT = -7.4173426;
const EXPECTED_LNG = 109.2517463;
const PLACES_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

// Hasil resolve nyata (dites langsung lewat curl -D -, lihat index.ts) —
// link web membawa "!3d..!4d.." (posisi pin persis) di URL redirect-nya.
const WEB_RESOLVED_URL =
  `https://www.google.com/maps/place/Iga+Sapi+Merdeka/@${EXPECTED_LAT},${EXPECTED_LNG},17z/data=!3m1!4b1!4m6!3m5!1s${CID}!8m2!3d${EXPECTED_LAT}!4d${EXPECTED_LNG}!16s%2Fg%2F11qn2_fspv!18m1!1e1`;

// Link mobile HANYA membawa place reference (CID), tanpa @lat,lng maupun
// !3d/!4d sama sekali.
const MOBILE_RESOLVED_URL =
  `https://www.google.com/maps/place/Iga+Sapi+Merdeka,+Jl.+Prof.+Dr.+Suharso+No.98,+Arcawinangun,+Purwokerto+Timur,+Banyumas+Regency,+Central+Java+53113/data=!4m2!3m1!1s${CID}!18m1!1e1`;

function post(url: string): Request {
  return new Request("https://example.supabase.co/functions/v1/resolve-maps-link", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

function placesSearchResponse(results: Array<{ latitude: number; longitude: number }>): Response {
  return new Response(JSON.stringify({ places: results.map((location) => ({ location })) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Ganti globalThis.fetch untuk durasi satu test, lalu kembalikan ke aslinya
// — supaya test tidak saling bocor mock satu sama lain.
async function withMockFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<void>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(input, init))) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

// GOOGLE_PLACES_API_KEY dibaca lewat Deno.env.get() di dalam fungsi (bukan
// konstanta top-level) justru supaya bisa di-toggle per test seperti ini.
function withPlacesApiKey(key: string | undefined, run: () => Promise<void>): Promise<void> {
  const original = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (key === undefined) Deno.env.delete("GOOGLE_PLACES_API_KEY");
  else Deno.env.set("GOOGLE_PLACES_API_KEY", key);
  return run().finally(() => {
    if (original === undefined) Deno.env.delete("GOOGLE_PLACES_API_KEY");
    else Deno.env.set("GOOGLE_PLACES_API_KEY", original);
  });
}

Deno.test("web short URL -> koordinat lewat !3d/!4d setelah 1 hop redirect, tanpa panggil Places API", async () => {
  await withMockFetch(
    (input) => {
      const url = input.toString();
      if (url === WEB_SHORT_URL) return redirectResponse(WEB_RESOLVED_URL);
      throw new Error(`unexpected fetch: ${url}`);
    },
    async () => {
      const res = await handleRequest(post(WEB_SHORT_URL));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.lat, EXPECTED_LAT);
      assertEquals(body.lng, EXPECTED_LNG);
      assertEquals(body.placeRef, CID);
      assertEquals(body.resolvedUrl, WEB_RESOLVED_URL);
    },
  );
});

Deno.test("mobile short URL -> tanpa @lat,lng, fallback geocode by name+address via Places API", async () => {
  let placesCalled = false;
  await withPlacesApiKey("test-api-key", () =>
    withMockFetch(
      (input, init) => {
        const url = input.toString();
        if (url === MOBILE_SHORT_URL) return redirectResponse(MOBILE_RESOLVED_URL);
        if (url === PLACES_SEARCH_ENDPOINT) {
          placesCalled = true;
          assertEquals((init?.headers as Record<string, string>)["X-Goog-Api-Key"], "test-api-key");
          const body = JSON.parse(init!.body as string);
          assertMatch(body.textQuery, /Iga Sapi Merdeka/); // query dibentuk dari nama tempat
          return placesSearchResponse([{ latitude: EXPECTED_LAT, longitude: EXPECTED_LNG }]);
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
      async () => {
        const res = await handleRequest(post(MOBILE_SHORT_URL));
        assertEquals(res.status, 200);
        const body = await res.json();
        assertEquals(body.lat, EXPECTED_LAT);
        assertEquals(body.lng, EXPECTED_LNG);
        assertEquals(body.name, "Iga Sapi Merdeka");
        // Beda dari kasus web (URL-nya tidak membawa teks alamat sama
        // sekali) — link mobile membawa "Nama, Alamat..." lengkap, jadi
        // address ikut dikembalikan supaya form kontributor bisa auto-isi.
        assertEquals(body.address, "Jl. Prof. Dr. Suharso No.98, Arcawinangun, Purwokerto Timur, Banyumas Regency, Central Java 53113");
        assertEquals(body.placeRef, CID);
        assertEquals(placesCalled, true);
      },
    ));
});

Deno.test("web short URL -> tidak ada teks alamat di URL-nya, address absen dari response", async () => {
  await withMockFetch(
    (input) => {
      const url = input.toString();
      if (url === WEB_SHORT_URL) return redirectResponse(WEB_RESOLVED_URL);
      throw new Error(`unexpected fetch: ${url}`);
    },
    async () => {
      const res = await handleRequest(post(WEB_SHORT_URL));
      const body = await res.json();
      assertEquals(body.address, undefined);
    },
  );
});

Deno.test("link web & mobile untuk cafe yang sama -> hasil lat/lng identik", async () => {
  const results: Array<{ lat: number; lng: number }> = [];

  await withMockFetch(
    (input) => {
      const url = input.toString();
      if (url === WEB_SHORT_URL) return redirectResponse(WEB_RESOLVED_URL);
      throw new Error(`unexpected fetch: ${url}`);
    },
    async () => {
      const res = await handleRequest(post(WEB_SHORT_URL));
      results.push(await res.json());
    },
  );

  await withPlacesApiKey("test-api-key", () =>
    withMockFetch(
      (input) => {
        const url = input.toString();
        if (url === MOBILE_SHORT_URL) return redirectResponse(MOBILE_RESOLVED_URL);
        if (url === PLACES_SEARCH_ENDPOINT) {
          return placesSearchResponse([{ latitude: EXPECTED_LAT, longitude: EXPECTED_LNG }]);
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
      async () => {
        const res = await handleRequest(post(MOBILE_SHORT_URL));
        results.push(await res.json());
      },
    ));

  assertEquals(results[0].lat, results[1].lat);
  assertEquals(results[0].lng, results[1].lng);
});

Deno.test("direct URL dengan @lat,lng -> fast path, tidak ada fetch sama sekali", async () => {
  const directUrl = `https://www.google.com/maps/place/Marii+Kitchen/@${EXPECTED_LAT},${EXPECTED_LNG},16.73z`;
  await withMockFetch(
    (input) => {
      throw new Error(`fetch tidak seharusnya dipanggil untuk fast path: ${input}`);
    },
    async () => {
      const res = await handleRequest(post(directUrl));
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.lat, EXPECTED_LAT);
      assertEquals(body.lng, EXPECTED_LNG);
      assertEquals(body.name, "Marii Kitchen");
    },
  );
});

Deno.test("URL tidak valid -> 400", async () => {
  const res = await handleRequest(post("bukan-url-sama-sekali"));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertMatch(body.error, /tidak valid/i);
});

Deno.test("host bukan Google Maps -> 400", async () => {
  const res = await handleRequest(post("https://example.com/maps/place/foo/@1,2,3z"));
  assertEquals(res.status, 400);
  const body = await res.json();
  assertMatch(body.error, /Google Maps/);
});

Deno.test("short URL gagal di-resolve (network error) -> 422", async () => {
  await withMockFetch(
    () => {
      throw new TypeError("network error");
    },
    async () => {
      const res = await handleRequest(post(WEB_SHORT_URL));
      assertEquals(res.status, 422);
      const body = await res.json();
      assertMatch(body.error, /[Kk]oordinat tidak ditemukan/);
    },
  );
});

Deno.test("CID ada tapi Places API juga tidak menemukan apa-apa -> 422, bukan pin salah", async () => {
  await withPlacesApiKey("test-api-key", () =>
    withMockFetch(
      (input) => {
        const url = input.toString();
        if (url === MOBILE_SHORT_URL) return redirectResponse(MOBILE_RESOLVED_URL);
        if (url === PLACES_SEARCH_ENDPOINT) return placesSearchResponse([]);
        throw new Error(`unexpected fetch: ${url}`);
      },
      async () => {
        const res = await handleRequest(post(MOBILE_SHORT_URL));
        assertEquals(res.status, 422);
        const body = await res.json();
        assertMatch(body.error, /[Kk]oordinat tidak ditemukan/);
      },
    ));
});

Deno.test("CID ada tapi GOOGLE_PLACES_API_KEY belum di-set -> skip Places API, 422 (bukan crash)", async () => {
  await withPlacesApiKey(undefined, () =>
    withMockFetch(
      (input) => {
        const url = input.toString();
        if (url === MOBILE_SHORT_URL) return redirectResponse(MOBILE_RESOLVED_URL);
        // Sengaja tidak menangani PLACES_SEARCH_ENDPOINT di sini — kalau
        // sampai dipanggil padahal API key tidak ada, test ini harus gagal.
        throw new Error(`unexpected fetch: ${url}`);
      },
      async () => {
        const res = await handleRequest(post(MOBILE_SHORT_URL));
        assertEquals(res.status, 422);
        const body = await res.json();
        assertMatch(body.error, /[Kk]oordinat tidak ditemukan/);
      },
    ));
});
