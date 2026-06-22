"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dnaToMarkdown = dnaToMarkdown;
exports.dnaToBriefingSection = dnaToBriefingSection;
exports.dnaToExportJson = dnaToExportJson;
function dnaToMarkdown(profile, dna) {
    var _a;
    const name = ((_a = profile.name) === null || _a === void 0 ? void 0 : _a.trim()) || 'Esta essência';
    const lines = [];
    lines.push(`# DNA Religare — ${name}`);
    if (profile.birthDate || profile.birthPlace) {
        const meta = [profile.birthDate, profile.birthPlace].filter(Boolean).join(' · ');
        lines.push(`_${meta}_`);
    }
    lines.push('');
    lines.push('## Essência');
    if (dna.essence.bigThree) {
        const { sun, moon, rising } = dna.essence.bigThree;
        lines.push(`- **Sol:** ${sun.signPt}`);
        lines.push(`- **Lua:** ${moon.signPt}`);
        lines.push(`- **Ascendente:** ${rising.signPt}`);
    }
    if (dna.essence.kin) {
        lines.push(`- **Kin natal:** ${dna.essence.kin.kin} (${dna.essence.kin.tone} ${dna.essence.kin.seal})`);
    }
    if (dna.essence.archetypes) {
        lines.push(`- **Arquétipos:** ${dna.essence.archetypes.primary} / ${dna.essence.archetypes.secondary}`);
    }
    if (dna.essence.callings.length) {
        lines.push(`- **Chamados vocacionais:** ${dna.essence.callings.slice(0, 4).map((c) => c.name).join(', ')}`);
    }
    lines.push('');
    lines.push('## Fios condutores (temas convergentes)');
    for (const t of dna.themes.slice(0, 6)) {
        lines.push(`- ${t.label} (peso ${t.weight})`);
    }
    lines.push('');
    lines.push(`## Tom de voz`);
    lines.push(dna.toneOfVoice);
    lines.push('');
    lines.push('## Síntese integrativa');
    lines.push(dna.narrative.integrative);
    lines.push('');
    const sections = [
        ['Astrologia', dna.narrative.astrology],
        ['Tzolkin', dna.narrative.tzolkin],
        ['Arquétipos', dna.narrative.archetypes],
        ['Vocação', dna.narrative.vocational],
        ['Human Design', dna.narrative.humanDesign],
    ];
    for (const [title, text] of sections) {
        if (!text)
            continue;
        lines.push(`## ${title}`);
        lines.push(text);
        lines.push('');
    }
    return lines.join('\n');
}
function dnaToBriefingSection(dna) {
    const lines = [];
    lines.push('### Leitura Religare (essência)');
    const essenceBits = [];
    if (dna.essence.bigThree) {
        const { sun, moon, rising } = dna.essence.bigThree;
        essenceBits.push(`Sol em ${sun.signPt}, Lua em ${moon.signPt}, Ascendente em ${rising.signPt}`);
    }
    if (dna.essence.archetypes) {
        essenceBits.push(`arquétipos ${dna.essence.archetypes.primary}/${dna.essence.archetypes.secondary}`);
    }
    if (dna.essence.callings.length) {
        essenceBits.push(`chamados: ${dna.essence.callings.slice(0, 3).map((c) => c.name).join(', ')}`);
    }
    if (essenceBits.length) {
        lines.push(`- Essência: ${essenceBits.join('; ')}.`);
    }
    if (dna.toneOfVoice) {
        lines.push(`- Tom de voz: ${dna.toneOfVoice}`);
    }
    if (dna.themes.length) {
        lines.push(`- Fios condutores: ${dna.themes.slice(0, 5).map((t) => t.label).join(', ')}.`);
    }
    if (dna.narrative.integrative) {
        lines.push('');
        lines.push('Síntese integrativa (use como direção de voz e ângulo de conteúdo):');
        lines.push(dna.narrative.integrative);
    }
    return lines.join('\n');
}
function dnaToExportJson(profile, dna) {
    var _a, _b, _c;
    return {
        meta: {
            name: (_a = profile.name) !== null && _a !== void 0 ? _a : null,
            birthDate: (_b = profile.birthDate) !== null && _b !== void 0 ? _b : null,
            birthPlace: (_c = profile.birthPlace) !== null && _c !== void 0 ? _c : null,
            generatedAt: new Date().toISOString(),
        },
        dna,
    };
}
//# sourceMappingURL=markdown.js.map