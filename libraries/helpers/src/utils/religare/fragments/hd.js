"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeFragment = typeFragment;
exports.authorityFragment = authorityFragment;
exports.profileFragment = profileFragment;
exports.definitionFragment = definitionFragment;
const TYPE_TEXT = {
    generator: {
        text: 'Sua energia é a de um Gerador — constante e sustentável quando respondendo ao que a vida traz, em vez de iniciar a partir do nada.',
        tags: { servico: 2, estrutura: 1 },
    },
    manifestingGenerator: {
        text: 'Sua energia é a de um Gerador Manifestante — rápida, multifacetada, capaz de pular etapas quando responde ao que ressoa.',
        tags: { servico: 1, transformacao: 1, liberdade: 1 },
    },
    manifestor: {
        text: 'Sua energia é a de um Manifestador — nasceu para iniciar e dar o primeiro passo, impactando o ambiente à sua volta.',
        tags: { lideranca: 2, liberdade: 1 },
    },
    projector: {
        text: 'Sua energia é a de um Projetor — não-sacral, feita para enxergar com profundidade e guiar a energia dos outros, não para sustentá-la sozinho.',
        tags: { intuicao: 2, introspeccao: 1 },
    },
    reflector: {
        text: 'Sua energia é a de um Refletor — um espelho raro e sensível do ambiente, que precisa de tempo e ciclos para conhecer a própria clareza.',
        tags: { intuicao: 2, conexao: 1 },
    },
};
const AUTHORITY_TEXT = {
    emotional: {
        text: 'Sua autoridade é Emocional — a clareza chega na onda, não no instante; decisões boas esperam o ciclo da emoção se assentar.',
        tags: { introspeccao: 2, intuicao: 1 },
    },
    sacral: {
        text: 'Sua autoridade é Sacral — o corpo responde antes da mente, num sim ou não imediato e visceral.',
        tags: { intuicao: 1, servico: 1 },
    },
    splenic: {
        text: 'Sua autoridade é Esplênica — um instinto silencioso e no presente, que fala uma vez e não se repete.',
        tags: { intuicao: 2 },
    },
    ego: {
        text: 'Sua autoridade é do Ego/Coração — decisões nascem da vontade e do que vale o esforço, com força e compromisso.',
        tags: { lideranca: 1, estrutura: 1 },
    },
    selfProjected: {
        text: 'Sua autoridade é Autoprojetada — a clareza aparece quando você se ouve falando em voz alta sobre o próprio caminho.',
        tags: { comunicacao: 1, introspeccao: 1 },
    },
    lunar: {
        text: 'Sua autoridade é Lunar — a clareza pede um ciclo lunar completo (~28 dias) observando a mesma questão sob ângulos diferentes.',
        tags: { introspeccao: 2, intuicao: 1 },
    },
    mental: {
        text: 'Sua autoridade é Mental/Ambiental — a clareza vem de fora, processando em voz alta no ambiente certo, sem pressa de decidir sozinho.',
        tags: { comunicacao: 1, conexao: 1 },
    },
};
const DEFINITION_TEXT = {
    none: {
        text: 'Sem Definição fixa — cada centro depende do ambiente pra se completar, o que dá uma sensibilidade rara à energia de quem está por perto.',
        tags: { intuicao: 1, conexao: 1 },
    },
    single: {
        text: 'Definição Única — sua energia interna já é um circuito fechado e consistente, sem precisar de ninguém pra se sentir completo.',
        tags: { estrutura: 1, intuicao: 1 },
    },
    split: {
        text: 'Definição Dividida — duas partes internas que se completam através de outras pessoas; conexão genuína é o que liga seus dois lados.',
        tags: { conexao: 2 },
    },
    tripleSplit: {
        text: 'Definição Tripla — três partes internas, o que pede uma rede mais ampla de pessoas pra circular energia e se sentir inteiro.',
        tags: { conexao: 2, liberdade: 1 },
    },
    quadrupleSplit: {
        text: 'Definição Quádrupla — quatro partes internas independentes; rara versatilidade, e uma necessidade ainda maior de comunidade diversa.',
        tags: { conexao: 2, liberdade: 1, comunicacao: 1 },
    },
};
const PROFILE_LABEL_PT = {
    '1/3': 'Investigador/Mártir',
    '1/4': 'Investigador/Oportunista',
    '2/4': 'Eremita/Oportunista',
    '2/5': 'Eremita/Herege',
    '3/5': 'Mártir/Herege',
    '3/6': 'Mártir/Modelo',
    '4/6': 'Oportunista/Modelo',
    '4/1': 'Oportunista/Investigador',
    '5/1': 'Herege/Investigador',
    '5/2': 'Herege/Eremita',
    '6/2': 'Modelo/Eremita',
    '6/3': 'Modelo/Mártir',
};
const PROFILE_TAGS = {
    '1/3': { introspeccao: 2, transformacao: 1 },
    '1/4': { introspeccao: 1, conexao: 1 },
    '2/4': { intuicao: 1, conexao: 1 },
    '2/5': { intuicao: 1, servico: 1 },
    '3/5': { transformacao: 1, servico: 1 },
    '3/6': { transformacao: 1, ensino: 1 },
    '4/6': { conexao: 1, ensino: 1 },
    '4/1': { conexao: 1, introspeccao: 1 },
    '5/1': { servico: 1, introspeccao: 1 },
    '5/2': { servico: 1, intuicao: 1 },
    '6/2': { ensino: 1, intuicao: 1 },
    '6/3': { ensino: 1, transformacao: 1 },
};
function typeFragment(type) {
    const { text, tags } = TYPE_TEXT[type];
    return { id: `hd-type-${type}`, section: 'humanDesign', text, tags };
}
function authorityFragment(authority) {
    const { text, tags } = AUTHORITY_TEXT[authority];
    return { id: `hd-authority-${authority}`, section: 'humanDesign', text, tags };
}
function profileFragment(profile) {
    const label = PROFILE_LABEL_PT[profile];
    const tags = PROFILE_TAGS[profile] || {};
    const text = label
        ? `Seu Perfil é ${profile} (${label}) — a combinação única de como você aprende a vida (linha consciente) e como vive de fato (linha inconsciente).`
        : `Seu Perfil é ${profile}.`;
    return { id: `hd-profile-${profile.replace('/', '-')}`, section: 'humanDesign', text, tags };
}
function definitionFragment(definition) {
    const { text, tags } = DEFINITION_TEXT[definition];
    return { id: `hd-definition-${definition}`, section: 'humanDesign', text, tags };
}
//# sourceMappingURL=hd.js.map