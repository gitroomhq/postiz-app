// Geocoding: birth place name → coordinates + IANA timezone.
//
// Provisional: a single keyless call to Open-Meteo's geocoding API at save time.
// Isolated behind this one function so it can later be swapped for an offline
// city dataset without touching the service. Resolved coords are persisted on the
// profile, so a future outage of this service does not break already-computed
// readings. Security: host is hardcoded (no SSRF), the user-supplied place is
// URL-encoded, the call is time-boxed, and any failure returns null (the save
// proceeds with astrology/dna left pending).

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** IANA timezone, e.g. "America/Sao_Paulo". */
  ianaTz: string;
  resolvedName: string;
}

const GEOCODE_TIMEOUT_MS = 4000;

export async function geocodePlace(
  place: string
): Promise<GeocodeResult | null> {
  const name = (place || '').trim();
  if (name.length < 2) return null;

  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const hit = data?.results?.[0];
    if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') {
      return null;
    }
    return {
      lat: hit.latitude,
      lng: hit.longitude,
      ianaTz: hit.timezone || 'UTC',
      resolvedName: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
