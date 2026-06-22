"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDNA = buildDNA;
const archetypes_1 = require("./archetypes");
const astrology_1 = require("./fragments/astrology");
const archetypes_2 = require("./fragments/archetypes");
const hd_1 = require("./fragments/hd");
const integrative_1 = require("./fragments/integrative");
const tzolkin_1 = require("./fragments/tzolkin");
const vocational_1 = require("./fragments/vocational");
const themes_1 = require("./themes");
const THEME_VOICE = {
    comunicacao: 'expressivo e articulado',
    lideranca: 'firme e inspirador',
    criacao: 'criativo e original',
    estrategia: 'analítico e perspicaz',
    servico: 'acolhedor e generoso',
    introspeccao: 'reflexivo e profundo',
    conexao: 'caloroso e próximo',
    transformacao: 'intenso e provocador',
    ensino: 'didático e esclarecedor',
    liberdade: 'livre e aventureiro',
    estrutura: 'sólido e confiável',
    intuicao: 'sensível e intuitivo',
};
function addTags(acc, frag) {
    for (const [k, v] of Object.entries(frag.tags)) {
        acc[k] = (acc[k] || 0) + (v !== null && v !== void 0 ? v : 0);
    }
}
function joinPt(items) {
    if (items.length <= 1)
        return items[0] || '';
    return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}
function buildDNA(input) {
    var _a, _b, _c, _d, _e;
    const name = (input.name || '').trim() || 'Esta essência';
    const tagTotals = {};
    const used = [];
    const collect = (frag) => {
        used.push(frag);
        addTags(tagTotals, frag);
        return frag.text;
    };
    let astrology = '';
    if (input.astrology) {
        const { sun, moon, rising } = input.astrology.bigThree;
        astrology = [
            collect((0, astrology_1.sunFragment)(sun.sign)),
            collect((0, astrology_1.moonFragment)(moon.sign)),
            collect((0, astrology_1.risingFragment)(rising.sign)),
        ].join(' ');
    }
    let tzolkin = '';
    if (input.kin) {
        const parts = [
            collect((0, tzolkin_1.sealFragment)(input.kin.sealIndex)),
            collect((0, tzolkin_1.toneFragment)(input.kin.toneIndex)),
        ];
        if (input.moon) {
            parts.push(`Nasceu sob a ${input.moon.name} ${input.moon.emoji} — energia de ${input.moon.desc.toLowerCase()}.`);
        }
        tzolkin = parts.join(' ');
    }
    let archetypes = '';
    if (input.archetypes) {
        archetypes = [
            collect((0, archetypes_2.primaryArchetypeFragment)(input.archetypes.primary)),
            collect((0, archetypes_2.secondaryArchetypeFragment)(input.archetypes.secondary)),
        ].join(' ');
    }
    let vocational = '';
    if (input.vocational && input.vocational.callings.length) {
        const top = input.vocational.callings.slice(0, 4);
        const lines = top.map((c, i) => collect((0, vocational_1.vocationFragment)(c.key, i)));
        const names = joinPt(top.map((c) => c.name));
        vocational = `Seus chamados mais fortes apontam para ${names}. ${lines.join(' ')}`;
    }
    let humanDesign = '';
    if (input.humanDesign) {
        const hd = input.humanDesign;
        humanDesign = [
            collect((0, hd_1.typeFragment)(hd.type)),
            collect((0, hd_1.authorityFragment)(hd.authority)),
            collect((0, hd_1.profileFragment)(hd.profile)),
            collect((0, hd_1.definitionFragment)(hd.definition)),
        ].join(' ');
    }
    const themes = Object.keys(tagTotals)
        .map((key) => ({ key, label: themes_1.THEME_LABELS[key], weight: tagTotals[key] }))
        .sort((a, b) => b.weight - a.weight);
    const topThemes = themes.slice(0, 4);
    let integrative = '';
    if (topThemes.length) {
        const intro = `Quando olhamos ${name} por inteiro — céu, Kin, arquétipos, vocação e desenho energético juntos —, alguns fios condutores se repetem e revelam o centro da sua essência:`;
        const passages = topThemes.map((t) => integrative_1.INTEGRATIVE_FRAGMENTS[t.key].text);
        integrative = [intro, ...passages].join('\n\n');
    }
    else {
        integrative = `${name} ainda está sendo revelada. Complete o onboarding para gerar a leitura integrativa.`;
    }
    const voiceAdjs = topThemes.slice(0, 3).map((t) => THEME_VOICE[t.key]);
    let toneOfVoice = voiceAdjs.length
        ? `Uma voz ${joinPt(voiceAdjs)}.`
        : 'Voz a definir após o onboarding.';
    if (input.archetypes) {
        toneOfVoice += ` Fala a partir do ${archetypes_1.ARCHETYPE_INFO[input.archetypes.primary].name}.`;
    }
    return {
        essence: {
            bigThree: (_b = (_a = input.astrology) === null || _a === void 0 ? void 0 : _a.bigThree) !== null && _b !== void 0 ? _b : null,
            kin: (_c = input.kin) !== null && _c !== void 0 ? _c : null,
            archetypes: input.archetypes
                ? { primary: input.archetypes.primary, secondary: input.archetypes.secondary }
                : null,
            callings: (_e = (_d = input.vocational) === null || _d === void 0 ? void 0 : _d.callings) !== null && _e !== void 0 ? _e : [],
        },
        themes,
        toneOfVoice,
        narrative: { astrology, tzolkin, archetypes, vocational, humanDesign, integrative },
    };
}
//# sourceMappingURL=dna.js.map