"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sealFragment = sealFragment;
exports.toneFragment = toneFragment;
const tzolkin_1 = require("../tzolkin");
const SEAL_TRAITS = [
    { essence: 'nutre e dá origem — guarda o começo das coisas', tags: { servico: 1, criacao: 1 } },
    { essence: 'comunica e inspira — leva a palavra e o sopro adiante', tags: { comunicacao: 2 } },
    { essence: 'sonha e abundância — acessa o intuitivo e o profundo', tags: { intuicao: 1, introspeccao: 1 } },
    { essence: 'faz florescer — cultiva potencial e o leva a crescer', tags: { criacao: 1, ensino: 1 } },
    { essence: 'instinto e força vital — move pelo corpo e pelo desejo', tags: { transformacao: 1, conexao: 1 } },
    { essence: 'faz a ponte — conecta mundos e iguala as pessoas', tags: { conexao: 2 } },
    { essence: 'realiza e cura — age com as mãos e conclui', tags: { servico: 1, transformacao: 1 } },
    { essence: 'embeleza e harmoniza — cria arte e elegância', tags: { criacao: 2 } },
    { essence: 'purifica e flui — sente a emoção como água', tags: { intuicao: 1, introspeccao: 1 } },
    { essence: 'ama e é leal — fortalece os laços de coração', tags: { conexao: 2 } },
    { essence: 'brinca e encanta — cria magia pela leveza', tags: { criacao: 1, comunicacao: 1 } },
    { essence: 'tem sabedoria e livre-arbítrio — influencia pelo entendimento', tags: { intuicao: 1, ensino: 1 } },
    { essence: 'explora e expande — atravessa espaços e desperta', tags: { liberdade: 2 } },
    { essence: 'encanta o tempo — recebe e irradia receptividade', tags: { intuicao: 2 } },
    { essence: 'tem visão ampla — enxerga o todo e antecipa', tags: { estrategia: 2 } },
    { essence: 'é inteligência destemida — questiona e abre caminho', tags: { lideranca: 1, transformacao: 1 } },
    { essence: 'navega pela sincronicidade — sintoniza com a vida', tags: { conexao: 1, intuicao: 1 } },
    { essence: 'reflete e ordena — revela a verdade sem ilusão', tags: { introspeccao: 2 } },
    { essence: 'gera transformação — catalisa e renova por dentro', tags: { transformacao: 2 } },
    { essence: 'ilumina e dá vida — irradia consciência', tags: { lideranca: 1, transformacao: 1 } },
];
const TONE_TRAITS = [
    { essence: 'atrai o propósito', tags: { lideranca: 1 } },
    { essence: 'reconhece o desafio e a polaridade', tags: { introspeccao: 1 } },
    { essence: 'ativa pelo serviço', tags: { conexao: 1, servico: 1 } },
    { essence: 'define a forma e a medida', tags: { estrutura: 1 } },
    { essence: 'empodera e comanda o centro', tags: { lideranca: 1 } },
    { essence: 'organiza e equilibra', tags: { estrutura: 1 } },
    { essence: 'sintoniza e canaliza', tags: { intuicao: 1 } },
    { essence: 'harmoniza pela integridade', tags: { estrutura: 1, conexao: 1 } },
    { essence: 'realiza a intenção', tags: { transformacao: 1 } },
    { essence: 'manifesta e produz', tags: { criacao: 1 } },
    { essence: 'dissolve e liberta', tags: { liberdade: 1 } },
    { essence: 'dedica-se à cooperação', tags: { conexao: 1 } },
    { essence: 'transcende e perdura', tags: { transformacao: 1 } },
];
function sealFragment(sealIndex) {
    const t = SEAL_TRAITS[sealIndex] || SEAL_TRAITS[0];
    return {
        id: `tz-seal-${sealIndex}`,
        section: 'tzolkin',
        text: `Seu selo natal é o ${tzolkin_1.SEALS[sealIndex]}: ${t.essence}.`,
        tags: t.tags,
    };
}
function toneFragment(toneIndex) {
    const t = TONE_TRAITS[toneIndex] || TONE_TRAITS[0];
    return {
        id: `tz-tone-${toneIndex}`,
        section: 'tzolkin',
        text: `Em tom ${tzolkin_1.TONES[toneIndex]}, esse pulso ${t.essence}.`,
        tags: t.tags,
    };
}
//# sourceMappingURL=tzolkin.js.map