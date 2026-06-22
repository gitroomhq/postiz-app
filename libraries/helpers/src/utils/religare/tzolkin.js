"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEAL_ACCENT = exports.TONES = exports.SEALS = void 0;
exports.kinForDate = kinForDate;
exports.getTodayKin = getTodayKin;
exports.SEALS = [
    'Dragão', 'Vento', 'Noite', 'Semente', 'Serpente',
    'Transformador', 'Veado', 'Estrela', 'Lua', 'Cão',
    'Macaco', 'Humano', 'Andarilho Celeste', 'Mago', 'Águia',
    'Guerreiro', 'Terra', 'Espelho', 'Tempestade', 'Sol',
];
exports.TONES = [
    'Magnético', 'Lunar', 'Elétrico', 'Auto-Existente', 'Radiante',
    'Rítmico', 'Ressonante', 'Galático', 'Solar', 'Planetário',
    'Espectral', 'Cristal', 'Cósmico',
];
exports.SEAL_ACCENT = ['#cf6295', '#dcd0c3', '#2897bf', '#e89a7b'];
function kinForDate(date) {
    const anchor = new Date('1987-07-26T00:00:00Z').getTime();
    const day = new Date(date.getTime());
    day.setUTCHours(0, 0, 0, 0);
    const days = Math.floor((day.getTime() - anchor) / 86400000);
    const kin = (((34 - 1 + days) % 260) + 260) % 260 + 1;
    const sealIndex = (kin - 1) % 20;
    const toneIndex = (kin - 1) % 13;
    return {
        kin,
        seal: exports.SEALS[sealIndex],
        tone: exports.TONES[toneIndex],
        sealIndex,
        toneIndex,
        accent: exports.SEAL_ACCENT[sealIndex % 4],
    };
}
function getTodayKin() {
    return kinForDate(new Date());
}
//# sourceMappingURL=tzolkin.js.map