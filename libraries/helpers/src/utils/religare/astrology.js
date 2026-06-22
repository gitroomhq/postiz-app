"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNatalChart = computeNatalChart;
const circular_natal_horoscope_js_1 = require("circular-natal-horoscope-js");
const signs_1 = require("./signs");
const BODY_PT = {
    sun: 'Sol',
    moon: 'Lua',
    mercury: 'Mercúrio',
    venus: 'Vênus',
    mars: 'Marte',
    jupiter: 'Júpiter',
    saturn: 'Saturno',
    uranus: 'Urano',
    neptune: 'Netuno',
    pluto: 'Plutão',
    chiron: 'Quíron',
    northnode: 'Nodo Norte',
    lilith: 'Lilith',
};
const BODY_ORDER = Object.keys(BODY_PT);
function eclipticOf(entry) {
    var _a, _b, _c;
    return (_c = (_b = (_a = entry === null || entry === void 0 ? void 0 : entry.ChartPosition) === null || _a === void 0 ? void 0 : _a.Ecliptic) === null || _b === void 0 ? void 0 : _b.DecimalDegrees) !== null && _c !== void 0 ? _c : 0;
}
function toPlanet(entry, key) {
    var _a, _b;
    const eclipticDegree = eclipticOf(entry);
    const placement = (0, signs_1.signFromDegree)(eclipticDegree);
    return Object.assign(Object.assign({ key, name: BODY_PT[key] || (entry === null || entry === void 0 ? void 0 : entry.label) || key }, placement), { eclipticDegree, house: (_b = (_a = entry === null || entry === void 0 ? void 0 : entry.House) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null, retrograde: !!(entry === null || entry === void 0 ? void 0 : entry.isRetrograde) });
}
function parseOffsetMinutes(isoWithOffset) {
    const m = /([+-])(\d{2}):(\d{2})$/.exec(isoWithOffset || '');
    if (!m)
        return 0;
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}
function computeNatalChart(input) {
    var _a, _b, _c;
    const [y, mo, d] = input.birthDate.split('-').map((n) => parseInt(n, 10));
    const [hh, mm] = input.birthTime.split(':').map((n) => parseInt(n, 10));
    if (![y, mo, d, hh, mm].every((n) => Number.isFinite(n))) {
        throw new Error('Data ou hora de nascimento inválida');
    }
    const origin = new circular_natal_horoscope_js_1.Origin({
        year: y,
        month: mo - 1,
        date: d,
        hour: hh,
        minute: mm,
        latitude: input.latitude,
        longitude: input.longitude,
    });
    const horoscope = new circular_natal_horoscope_js_1.Horoscope({
        origin,
        houseSystem: 'placidus',
        zodiac: 'tropical',
        aspectPoints: ['bodies', 'points', 'angles'],
        aspectWithPoints: ['bodies', 'points', 'angles'],
        aspectTypes: ['major'],
    });
    const bodies = horoscope.CelestialBodies;
    const points = horoscope.CelestialPoints;
    const planets = [];
    for (const key of BODY_ORDER) {
        const entry = (_a = bodies === null || bodies === void 0 ? void 0 : bodies[key]) !== null && _a !== void 0 ? _a : points === null || points === void 0 ? void 0 : points[key];
        if (entry)
            planets.push(toPlanet(entry, key));
    }
    const houses = (horoscope.Houses || []).map((h) => {
        var _a, _b, _c, _d, _e;
        const eclipticDegree = (_d = (_c = (_b = (_a = h === null || h === void 0 ? void 0 : h.ChartPosition) === null || _a === void 0 ? void 0 : _a.StartPosition) === null || _b === void 0 ? void 0 : _b.Ecliptic) === null || _c === void 0 ? void 0 : _c.DecimalDegrees) !== null && _d !== void 0 ? _d : 0;
        const placement = (0, signs_1.signFromDegree)(eclipticDegree);
        return {
            house: (_e = h === null || h === void 0 ? void 0 : h.id) !== null && _e !== void 0 ? _e : 0,
            eclipticDegree,
            sign: placement.sign,
            signPt: placement.signPt,
        };
    });
    const ascDeg = eclipticOf(horoscope.Ascendant);
    const mcDeg = eclipticOf(horoscope.Midheaven);
    const sunDeg = eclipticOf(bodies === null || bodies === void 0 ? void 0 : bodies.sun);
    const moonDeg = eclipticOf(bodies === null || bodies === void 0 ? void 0 : bodies.moon);
    const aspects = (((_b = horoscope.Aspects) === null || _b === void 0 ? void 0 : _b.all) || []).map((a) => ({
        a: a.point1Key,
        b: a.point2Key,
        type: a.aspectKey,
        orb: typeof a.orb === 'number' ? Math.round(a.orb * 100) / 100 : 0,
    }));
    return {
        bigThree: {
            sun: (0, signs_1.signFromDegree)(sunDeg),
            moon: (0, signs_1.signFromDegree)(moonDeg),
            rising: (0, signs_1.signFromDegree)(ascDeg),
        },
        planets,
        houses,
        angles: {
            ascendant: Object.assign(Object.assign({}, (0, signs_1.signFromDegree)(ascDeg)), { eclipticDegree: ascDeg }),
            midheaven: Object.assign(Object.assign({}, (0, signs_1.signFromDegree)(mcDeg)), { eclipticDegree: mcDeg }),
        },
        aspects,
        utcOffsetMinutes: parseOffsetMinutes(origin.localTimeFormatted),
        ianaTz: ((_c = origin.timezone) === null || _c === void 0 ? void 0 : _c.name) || input.ianaTz,
    };
}
//# sourceMappingURL=astrology.js.map