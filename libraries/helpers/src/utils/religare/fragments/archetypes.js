"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.primaryArchetypeFragment = primaryArchetypeFragment;
exports.secondaryArchetypeFragment = secondaryArchetypeFragment;
const archetypes_1 = require("../archetypes");
const ARCHETYPE_TAGS = {
    innocent: { intuicao: 1, conexao: 1 },
    sage: { ensino: 2, estrategia: 1, introspeccao: 1 },
    explorer: { liberdade: 2, transformacao: 1 },
    outlaw: { transformacao: 2, liberdade: 1 },
    magician: { transformacao: 2, intuicao: 1, criacao: 1 },
    hero: { lideranca: 2, transformacao: 1 },
    lover: { conexao: 2, criacao: 1 },
    jester: { comunicacao: 2, conexao: 1 },
    everyman: { conexao: 2, servico: 1 },
    caregiver: { servico: 2, conexao: 1 },
    ruler: { lideranca: 2, estrutura: 1, estrategia: 1 },
    creator: { criacao: 2, comunicacao: 1 },
};
function scale(tags, factor) {
    const out = {};
    for (const [k, v] of Object.entries(tags))
        out[k] = (v !== null && v !== void 0 ? v : 0) * factor;
    return out;
}
function primaryArchetypeFragment(key) {
    const info = archetypes_1.ARCHETYPE_INFO[key];
    return {
        id: `arch-primary-${key}`,
        section: 'archetypes',
        text: `Seu arquétipo dominante é o ${info.name} — ${info.tagline.toLowerCase()}. ${info.description}`,
        tags: scale(ARCHETYPE_TAGS[key], 2),
    };
}
function secondaryArchetypeFragment(key) {
    const info = archetypes_1.ARCHETYPE_INFO[key];
    return {
        id: `arch-secondary-${key}`,
        section: 'archetypes',
        text: `Logo atrás, o ${info.name} (${info.tagline.toLowerCase()}) tempera sua expressão e abre uma segunda camada de como você age no mundo.`,
        tags: scale(ARCHETYPE_TAGS[key], 1),
    };
}
//# sourceMappingURL=archetypes.js.map