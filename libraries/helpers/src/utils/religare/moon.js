"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOON_PHASES = void 0;
exports.getMoonPhase = getMoonPhase;
exports.MOON_PHASES = [
    { name: 'Lua Nova', emoji: '🌑', desc: 'Intenções e novos começos' },
    { name: 'Lua Crescente', emoji: '🌒', desc: 'Expansão e ação' },
    { name: 'Quarto Crescente', emoji: '🌓', desc: 'Decisões produtivas' },
    { name: 'Gibosa Crescente', emoji: '🌔', desc: 'Refinamento e crescimento' },
    { name: 'Lua Cheia', emoji: '🌕', desc: 'Culminação e revelação' },
    { name: 'Gibosa Minguante', emoji: '🌖', desc: 'Gratidão e integração' },
    { name: 'Quarto Minguante', emoji: '🌗', desc: 'Reflexão e liberação' },
    { name: 'Lua Minguante', emoji: '🌘', desc: 'Descanso e entrega' },
];
function getMoonPhase(date = new Date()) {
    const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
    const cycle = 29.53058867 * 86400000;
    const elapsed = (((date.getTime() - knownNew) % cycle) + cycle) % cycle;
    const index = Math.floor((elapsed / cycle) * 8) % 8;
    return Object.assign(Object.assign({}, exports.MOON_PHASES[index]), { index });
}
//# sourceMappingURL=moon.js.map