"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGN_PT = exports.SIGN_KEYS = void 0;
exports.signFromDegree = signFromDegree;
exports.toAstroChartData = toAstroChartData;
exports.SIGN_KEYS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
exports.SIGN_PT = {
    aries: 'Áries',
    taurus: 'Touro',
    gemini: 'Gêmeos',
    cancer: 'Câncer',
    leo: 'Leão',
    virgo: 'Virgem',
    libra: 'Libra',
    scorpio: 'Escorpião',
    sagittarius: 'Sagitário',
    capricorn: 'Capricórnio',
    aquarius: 'Aquário',
    pisces: 'Peixes',
};
function signFromDegree(eclipticDegree) {
    const deg = ((eclipticDegree % 360) + 360) % 360;
    const idx = Math.floor(deg / 30) % 12;
    const sign = exports.SIGN_KEYS[idx];
    return { sign, signPt: exports.SIGN_PT[sign], degreeInSign: deg - idx * 30 };
}
const ASTROCHART_PLANET_NAME = {
    sun: 'Sun',
    moon: 'Moon',
    mercury: 'Mercury',
    venus: 'Venus',
    mars: 'Mars',
    jupiter: 'Jupiter',
    saturn: 'Saturn',
    uranus: 'Uranus',
    neptune: 'Neptune',
    pluto: 'Pluto',
    northnode: 'NNode',
    lilith: 'Lilith',
};
function toAstroChartData(result) {
    const planets = {};
    for (const p of result.planets) {
        const name = ASTROCHART_PLANET_NAME[p.key] || p.name;
        planets[name] = [p.eclipticDegree];
    }
    const cusps = result.houses
        .slice()
        .sort((a, b) => a.house - b.house)
        .map((h) => h.eclipticDegree);
    return { planets, cusps };
}
//# sourceMappingURL=signs.js.map