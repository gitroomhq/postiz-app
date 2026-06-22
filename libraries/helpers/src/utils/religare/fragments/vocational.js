"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vocationFragment = vocationFragment;
const vocational_1 = require("../vocational");
const VOCATION_TAGS = {
    creative: { criacao: 2 },
    analytical: { estrategia: 2, estrutura: 1 },
    caregiving: { servico: 2, conexao: 1 },
    leadership: { lideranca: 2, estrategia: 1 },
    entrepreneurial: { lideranca: 1, estrategia: 1, transformacao: 1 },
    communication: { comunicacao: 2, conexao: 1 },
    spiritual: { intuicao: 2, introspeccao: 1, servico: 1 },
    technical: { estrutura: 2, estrategia: 1 },
    artisan: { criacao: 1, estrutura: 1 },
    educator: { ensino: 2, comunicacao: 1 },
};
function scale(tags, factor) {
    const out = {};
    for (const [k, v] of Object.entries(tags))
        out[k] = (v !== null && v !== void 0 ? v : 0) * factor;
    return out;
}
function vocationFragment(key, rank) {
    const info = vocational_1.VOCATION_INFO[key];
    const factor = rank === 0 ? 2 : rank === 1 ? 1.5 : 1;
    return {
        id: `voc-${key}`,
        section: 'vocational',
        text: `${info.name}: ${info.description}`,
        tags: scale(VOCATION_TAGS[key], factor),
    };
}
//# sourceMappingURL=vocational.js.map