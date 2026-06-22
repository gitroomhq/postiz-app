"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHumanDesign = computeHumanDesign;
const astrology_1 = require("./astrology");
const hd_data_1 = require("./hd-data");
const HD_BODY_KEYS = [
    'sun',
    'earth',
    'moon',
    'northnode',
    'southnode',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
];
const STRATEGY_PT = {
    generator: 'Responder',
    manifestingGenerator: 'Responder, depois informar',
    manifestor: 'Informar antes de agir',
    projector: 'Esperar o convite',
    reflector: 'Esperar um ciclo lunar completo',
};
function degreeToGate(eclipticDegree) {
    const deg = ((eclipticDegree % 360) + 360) % 360;
    const shifted = ((deg - hd_data_1.GATE_WHEEL_START_DEGREE + 360) % 360 + 360) % 360;
    const gateIndex = Math.floor(shifted / hd_data_1.DEGREES_PER_GATE);
    const withinGate = shifted - gateIndex * hd_data_1.DEGREES_PER_GATE;
    const line = Math.floor(withinGate / hd_data_1.DEGREES_PER_LINE) + 1;
    return { gate: hd_data_1.GATE_WHEEL[gateIndex], line: Math.min(6, Math.max(1, line)) };
}
function bodyLongitudes(input) {
    const chart = (0, astrology_1.computeNatalChart)(input);
    const out = {};
    for (const p of chart.planets)
        out[p.key] = p.eclipticDegree;
    return out;
}
function activationsFrom(longitudes) {
    var _a, _b;
    const sun = (_a = longitudes.sun) !== null && _a !== void 0 ? _a : 0;
    const northnode = (_b = longitudes.northnode) !== null && _b !== void 0 ? _b : 0;
    const derived = Object.assign(Object.assign({}, longitudes), { earth: (sun + 180) % 360, southnode: (northnode + 180) % 360 });
    return HD_BODY_KEYS.map((key) => { var _a; return degreeToGate((_a = derived[key]) !== null && _a !== void 0 ? _a : 0); });
}
function msToNatalInput(ms) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return {
        birthDate: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
        birthTime: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
        latitude: 0,
        longitude: 0,
        ianaTz: 'Etc/UTC',
    };
}
function sunLongitudeAtUTC(ms) {
    var _a;
    return (_a = bodyLongitudes(msToNatalInput(ms)).sun) !== null && _a !== void 0 ? _a : 0;
}
function signedDiff(value, target) {
    return (((target - value + 540) % 360) + 360) % 360 - 180;
}
function findPersonalityInstant(birthUtcMs, targetLongitude) {
    let lo = birthUtcMs - 95 * 86400000;
    let hi = birthUtcMs - 80 * 86400000;
    const diffLo = signedDiff(sunLongitudeAtUTC(lo), targetLongitude);
    const diffHi = signedDiff(sunLongitudeAtUTC(hi), targetLongitude);
    const increasing = diffHi < diffLo;
    while (hi - lo > 60000) {
        const mid = Math.floor((lo + hi) / 2);
        const diffMid = signedDiff(sunLongitudeAtUTC(mid), targetLongitude);
        const targetStillAhead = increasing ? diffMid > 0 : diffMid < 0;
        if (targetStillAhead)
            lo = mid;
        else
            hi = mid;
    }
    return Math.round((lo + hi) / 2);
}
function unionFind(definedCenters, completedChannels) {
    const parent = new Map();
    for (const c of definedCenters)
        parent.set(c, c);
    const find = (c) => {
        let root = c;
        while (parent.get(root) !== root)
            root = parent.get(root);
        return root;
    };
    const union = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb)
            parent.set(ra, rb);
    };
    for (const { gates } of completedChannels) {
        const ca = hd_data_1.GATE_CENTER[gates[0]];
        const cb = hd_data_1.GATE_CENTER[gates[1]];
        if (definedCenters.has(ca) && definedCenters.has(cb))
            union(ca, cb);
    }
    return find;
}
function computeHumanDesign(input) {
    var _a, _b;
    const personalityLongitudes = bodyLongitudes(input);
    const personalityGates = activationsFrom(personalityLongitudes);
    const [y, mo, d] = input.birthDate.split('-').map((n) => parseInt(n, 10));
    const [hh, mm] = input.birthTime.split(':').map((n) => parseInt(n, 10));
    const birthChart = (0, astrology_1.computeNatalChart)(input);
    const birthUtcMs = Date.UTC(y, mo - 1, d, hh, mm) - birthChart.utcOffsetMinutes * 60000;
    const targetSunLongitude = (((_a = personalityLongitudes.sun) !== null && _a !== void 0 ? _a : 0) - 88 + 360) % 360;
    const designInstant = findPersonalityInstant(birthUtcMs, targetSunLongitude);
    const designLongitudes = bodyLongitudes(msToNatalInput(designInstant));
    const designGates = activationsFrom(designLongitudes);
    const activatedGates = new Set([
        ...designGates.map((g) => g.gate),
        ...personalityGates.map((g) => g.gate),
    ]);
    const completedChannels = hd_data_1.CHANNELS.filter((c) => activatedGates.has(c.gates[0]) && activatedGates.has(c.gates[1]));
    const definedCenters = new Set();
    for (const c of completedChannels) {
        definedCenters.add(hd_data_1.GATE_CENTER[c.gates[0]]);
        definedCenters.add(hd_data_1.GATE_CENTER[c.gates[1]]);
    }
    const centers = hd_data_1.CENTERS.reduce((acc, c) => {
        acc[c] = definedCenters.has(c);
        return acc;
    }, {});
    const find = unionFind(definedCenters, completedChannels);
    const components = new Set(Array.from(definedCenters).map((c) => find(c)));
    const definitionByCount = {
        0: 'none',
        1: 'single',
        2: 'split',
        3: 'tripleSplit',
        4: 'quadrupleSplit',
    };
    const definition = (_b = definitionByCount[Math.min(4, components.size)]) !== null && _b !== void 0 ? _b : 'quadrupleSplit';
    const throatDefined = centers.throat;
    const throatConnectedToMotor = throatDefined &&
        hd_data_1.MOTOR_CENTERS.some((m) => centers[m] && find(m) === find('throat'));
    const sacralDefined = centers.sacral;
    let type;
    if (definedCenters.size === 0)
        type = 'reflector';
    else if (sacralDefined && throatConnectedToMotor)
        type = 'manifestingGenerator';
    else if (sacralDefined)
        type = 'generator';
    else if (throatConnectedToMotor)
        type = 'manifestor';
    else
        type = 'projector';
    let authority;
    if (type === 'reflector')
        authority = 'lunar';
    else if (centers.solarPlexus)
        authority = 'emotional';
    else if (centers.sacral)
        authority = 'sacral';
    else if (centers.spleen)
        authority = 'splenic';
    else if (centers.heart)
        authority = 'ego';
    else if (centers.g)
        authority = 'selfProjected';
    else
        authority = 'mental';
    const personalitySun = personalityGates[0];
    const designSun = designGates[0];
    const profile = `${personalitySun.line}/${designSun.line}`;
    return {
        type,
        strategy: STRATEGY_PT[type],
        authority,
        profile,
        definition,
        centers,
        gates: { personality: personalityGates, design: designGates },
        definedChannels: completedChannels.map((c) => ({ gates: c.gates, name: c.name })),
    };
}
//# sourceMappingURL=hd.js.map