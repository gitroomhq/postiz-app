"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodePlace = geocodePlace;
const GEOCODE_TIMEOUT_MS = 4000;
async function geocodePlace(place) {
    var _a;
    const name = (place || '').trim();
    if (name.length < 2)
        return null;
    const url = 'https://geocoding-api.open-meteo.com/v1/search' +
        `?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok)
            return null;
        const data = await res.json();
        const hit = (_a = data === null || data === void 0 ? void 0 : data.results) === null || _a === void 0 ? void 0 : _a[0];
        if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') {
            return null;
        }
        return {
            lat: hit.latitude,
            lng: hit.longitude,
            ianaTz: hit.timezone || 'UTC',
            resolvedName: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
        };
    }
    catch (_b) {
        return null;
    }
    finally {
        clearTimeout(timeout);
    }
}
//# sourceMappingURL=religare-geocode.js.map