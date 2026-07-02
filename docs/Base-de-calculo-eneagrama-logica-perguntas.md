# Recomendação estratégica para o questionário de 100 perguntas

Para o Religare, eu usaria **45 perguntas para Eneagrama**, com **5 perguntas por tipo**, deixando **55 perguntas** para os outros blocos.

| Bloco                     | Perguntas | Observação                                                                  |
| ------------------------- | --------: | --------------------------------------------------------------------------- |
| Eneagrama                 |        45 | 5 por tipo, suficiente para tipo principal, asa, centro dominante e empates |
| Ikigai                    |        20 | 5 por quadrante                                                             |
| Teste Vocacional reduzido |        18 | Pode usar RIASEC com 3 perguntas por dimensão                               |
| Arquétipos de Marca       |        12 | 1 pergunta por arquétipo, funcionando como validação final                  |
| Numerologia Cabalística   |         5 | Melhor usar nome/data como base e perguntas só para calibragem simbólica    |
| **Total**                 |   **100** | Mantém o Eneagrama forte sem engolir o resto                                |

O Excel anexado é valioso como referência porque usa **20 perguntas por tipo**, escala **0 a 5** e blocos por número de personalidade. Para o sistema, porém, eu evitaria replicar 180 perguntas. A melhor adaptação é transformar a lógica em uma versão mais enxuta, normalizada e comparável com os outros módulos.

Sobre os repositórios: o `acguardia/eneagrama` é útil como exemplo simples, pois possui um teste com 30 questões e mapeamento direto pergunta → tipo, mas é básico demais para ser a referência principal do Religare. O `Typix` é mais interessante como arquitetura de produto, já que se apresenta como uma aplicação com DISC, Eneagrama e Insights, com questionários e relatórios personalizados. ([GitHub][1]) Para a base conceitual do Eneagrama, faz sentido usar centros, asas, linhas de crescimento e estresse, pois o Enneagram Institute descreve os centros, as direções de integração/desintegração e a importância de considerar tipo básico, asa e linhas conectadas. ([The Enneagram Institute][2]) O Integrative9 também reforça o Eneagrama como estrutura com 3 centros de inteligência, 9 tipos, asas e 27 subtipos, útil para não reduzir o resultado a uma etiqueta fixa. ([Integrative9][3])

````md id="91nvd2"
# Base de Cálculo Eneagrama | Religare Vocaccio

## 1. Padrão adotado

Este sistema usa o Eneagrama como um modelo indicativo de autoconhecimento, não como diagnóstico clínico.

Objetivo dentro do Religare:

```ts
{
  primaryType: "tipo principal",
  wing: "asa provável",
  center: "centro dominante",
  centerScores: "pontuação por centro",
  trifix: "tipo dominante em cada centro, opcional",
  growthLine: "linha de crescimento",
  stressLine: "linha de estresse",
  confidence: "nível de confiança do resultado",
  brandArchetypeHints: "pistas para arquétipos de marca"
}
````

Regra estratégica:

```ts
O Eneagrama deve ser uma camada de leitura da personalidade e motivação.
Não deve ser usado sozinho para definir vocação, Ikigai, numerologia ou arquétipos de marca.
```

## 2. Quantidade recomendada de perguntas

Como o questionário total terá 100 perguntas e precisa cobrir Eneagrama, Numerologia Cabalística, Ikigai, Teste Vocacional reduzido e 2 arquétipos de marca, a alocação recomendada é:

```ts
const QUESTION_ALLOCATION = {
  enneagram: 45,
  ikigai: 20,
  vocational: 18,
  brandArchetypes: 12,
  numerologyCalibration: 5,
  total: 100
}
```

### Por que 45 perguntas para Eneagrama

```ts
45 perguntas = 9 tipos x 5 perguntas por tipo
```

Isso permite:

1. Medir todos os 9 tipos com equilíbrio.
2. Evitar que um tipo fique super representado.
3. Calcular tipo principal.
4. Calcular asa provável.
5. Calcular centro dominante.
6. Identificar empates técnicos.
7. Gerar pistas para arquétipos de marca.
8. Deixar espaço para Ikigai e vocação.

### Alternativas

```ts
const ENNEAGRAM_QUESTION_DEPTH = {
  minimum: {
    questions: 36,
    structure: "4 perguntas por tipo",
    useWhen: "questionário muito curto"
  },
  recommended: {
    questions: 45,
    structure: "5 perguntas por tipo",
    useWhen: "Religare 100 perguntas"
  },
  robust: {
    questions: 54,
    structure: "6 perguntas por tipo",
    useWhen: "questionário focado quase só em Eneagrama"
  },
  full: {
    questions: 180,
    structure: "20 perguntas por tipo",
    useWhen: "teste aprofundado separado"
  }
}
```

Para o Religare, usar 45.

## 3. Escala de resposta

Usar escala de 0 a 5.

```ts
const LIKERT_SCALE = [
  { value: 0, label: "Não, nunca" },
  { value: 1, label: "Raramente" },
  { value: 2, label: "Algumas vezes" },
  { value: 3, label: "Várias vezes" },
  { value: 4, label: "Geralmente" },
  { value: 5, label: "Sim, muito certo" }
]
```

Essa escala conversa bem com a lógica do Excel anexado e oferece mais nuance do que uma escala simples de 1 a 4.

## 4. Tipos do Eneagrama

```ts
const ENNEAGRAM_TYPES = {
  1: {
    name: "Tipo 1",
    title: "O Reformador",
    alternativeTitle: "O Perfeccionista",
    center: "instinctive",
    centerName: "Centro Instintivo",
    coreEmotion: "raiva",
    coreDesire: "ser bom, correto e íntegro",
    coreFear: "ser corrupto, errado ou moralmente falho",
    fixation: "ressentimento",
    virtue: "serenidade",
    brandHints: ["Sábio", "Governante", "Cuidador"]
  },
  2: {
    name: "Tipo 2",
    title: "O Ajudante",
    alternativeTitle: "O Prestativo",
    center: "feeling",
    centerName: "Centro Emocional",
    coreEmotion: "vergonha",
    coreDesire: "ser amado e necessário",
    coreFear: "não ser amado ou não ser desejado",
    fixation: "adulação",
    virtue: "humildade",
    brandHints: ["Cuidador", "Amante", "Inocente"]
  },
  3: {
    name: "Tipo 3",
    title: "O Realizador",
    alternativeTitle: "O Executor",
    center: "feeling",
    centerName: "Centro Emocional",
    coreEmotion: "vergonha",
    coreDesire: "ser valorizado, admirado e bem-sucedido",
    coreFear: "ser inútil, fracassado ou sem valor",
    fixation: "vaidade",
    virtue: "veracidade",
    brandHints: ["Herói", "Governante", "Mago"]
  },
  4: {
    name: "Tipo 4",
    title: "O Individualista",
    alternativeTitle: "O Romântico",
    center: "feeling",
    centerName: "Centro Emocional",
    coreEmotion: "vergonha",
    coreDesire: "encontrar identidade, significado e autenticidade",
    coreFear: "não ter identidade ou importância pessoal",
    fixation: "melancolia",
    virtue: "equanimidade",
    brandHints: ["Criador", "Amante", "Mago"]
  },
  5: {
    name: "Tipo 5",
    title: "O Investigador",
    alternativeTitle: "O Observador",
    center: "thinking",
    centerName: "Centro Mental",
    coreEmotion: "medo",
    coreDesire: "ser capaz, competente e compreender profundamente",
    coreFear: "ser incapaz, invadido ou impotente",
    fixation: "avarícia",
    virtue: "desapego",
    brandHints: ["Sábio", "Mago", "Explorador"]
  },
  6: {
    name: "Tipo 6",
    title: "O Leal",
    alternativeTitle: "O Guardião",
    center: "thinking",
    centerName: "Centro Mental",
    coreEmotion: "medo",
    coreDesire: "ter segurança, apoio e orientação",
    coreFear: "ficar sem suporte, proteção ou direção",
    fixation: "covardia",
    virtue: "coragem",
    brandHints: ["Cuidador", "Cara Comum", "Governante"]
  },
  7: {
    name: "Tipo 7",
    title: "O Entusiasta",
    alternativeTitle: "O Visionário",
    center: "thinking",
    centerName: "Centro Mental",
    coreEmotion: "medo",
    coreDesire: "ser livre, feliz e satisfeito",
    coreFear: "ficar preso na dor, limitação ou privação",
    fixation: "planejamento",
    virtue: "sobriedade",
    brandHints: ["Explorador", "Bobo", "Criador"]
  },
  8: {
    name: "Tipo 8",
    title: "O Desafiador",
    alternativeTitle: "O Protetor",
    center: "instinctive",
    centerName: "Centro Instintivo",
    coreEmotion: "raiva",
    coreDesire: "ser forte, autônomo e proteger o próprio território",
    coreFear: "ser controlado, vulnerável ou traído",
    fixation: "vingança",
    virtue: "inocência",
    brandHints: ["Herói", "Governante", "Fora da Lei"]
  },
  9: {
    name: "Tipo 9",
    title: "O Pacificador",
    alternativeTitle: "O Mediador",
    center: "instinctive",
    centerName: "Centro Instintivo",
    coreEmotion: "raiva",
    coreDesire: "ter paz, harmonia e estabilidade interior",
    coreFear: "perder conexão, conflito ou separação",
    fixation: "indolência",
    virtue: "ação correta",
    brandHints: ["Inocente", "Cuidador", "Cara Comum"]
  }
}
```

## 5. Centros de inteligência

```ts
const ENNEAGRAM_CENTERS = {
  instinctive: {
    name: "Centro Instintivo",
    types: [8, 9, 1],
    theme: "ação, corpo, controle, autonomia, presença",
    coreEmotion: "raiva",
    question: "Como a pessoa lida com território, autonomia, limites e ação?"
  },
  feeling: {
    name: "Centro Emocional",
    types: [2, 3, 4],
    theme: "imagem, vínculo, identidade, valor pessoal",
    coreEmotion: "vergonha",
    question: "Como a pessoa busca amor, reconhecimento, identidade e validação?"
  },
  thinking: {
    name: "Centro Mental",
    types: [5, 6, 7],
    theme: "segurança, estratégia, antecipação, pensamento",
    coreEmotion: "medo",
    question: "Como a pessoa busca segurança, clareza, possibilidade e orientação?"
  }
}
```

## 6. Linhas de crescimento e estresse

### Direção de crescimento

```ts
const GROWTH_LINES = {
  1: 7,
  2: 4,
  3: 6,
  4: 1,
  5: 8,
  6: 9,
  7: 5,
  8: 2,
  9: 3
}
```

### Direção de estresse

```ts
const STRESS_LINES = {
  1: 4,
  2: 8,
  3: 9,
  4: 2,
  5: 7,
  6: 3,
  7: 1,
  8: 5,
  9: 6
}
```

## 7. Asas

Cada tipo pode ter influência de um dos dois tipos vizinhos.

```ts
const WINGS = {
  1: [9, 2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5, 7],
  7: [6, 8],
  8: [7, 9],
  9: [8, 1]
}
```

### Cálculo da asa

```ts
function calculateWing(primaryType, normalizedTypeScores) {
  const [leftWing, rightWing] = WINGS[primaryType];

  const leftScore = normalizedTypeScores[leftWing];
  const rightScore = normalizedTypeScores[rightWing];

  const diff = Math.abs(leftScore - rightScore);

  if (diff <= 3) {
    return {
      wing: null,
      label: `Tipo ${primaryType} com asas equilibradas`,
      leftWing,
      rightWing,
      confidence: "baixa"
    };
  }

  const selectedWing = leftScore > rightScore ? leftWing : rightWing;

  return {
    wing: selectedWing,
    label: `${primaryType}w${selectedWing}`,
    leftWing,
    rightWing,
    confidence: diff >= 8 ? "alta" : "média"
  };
}
```

## 8. Estrutura das perguntas

Cada pergunta deve ser salva com metadados, não apenas com texto.

```ts
type EnneagramQuestion = {
  id: string;
  block: "enneagram";
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  facet:
    | "core_desire"
    | "core_fear"
    | "defense"
    | "behavior"
    | "shadow"
    | "growth";
  polarity: "direct" | "reverse";
  weight: number;
  text: string;
}
```

### Distribuição interna por tipo

Para cada tipo, usar 5 perguntas:

```ts
const PER_TYPE_QUESTION_STRUCTURE = [
  { facet: "core_desire", count: 1, weight: 1.2 },
  { facet: "core_fear", count: 1, weight: 1.2 },
  { facet: "defense", count: 1, weight: 1.0 },
  { facet: "behavior", count: 1, weight: 1.0 },
  { facet: "shadow", count: 1, weight: 1.1 }
]
```

### Exemplo de distribuição

```ts
const ENNEAGRAM_45_STRUCTURE = {
  type1: 5,
  type2: 5,
  type3: 5,
  type4: 5,
  type5: 5,
  type6: 5,
  type7: 5,
  type8: 5,
  type9: 5,
  total: 45
}
```

## 9. Ordem das perguntas

Não agrupar por tipo no questionário final.

O Excel anexado usa blocos por tipo, mas isso aumenta o risco de a pessoa perceber o padrão e responder de forma menos espontânea.

Usar ordem embaralhada e balanceada:

```ts
const TYPE_ROTATION = [5, 8, 2, 7, 1, 4, 6, 9, 3]
```

Essa ordem conversa com o Excel anexado, mas no questionário final ela deve ser intercalada.

Exemplo:

```ts
const QUESTION_ORDER_RULE = {
  avoidSameTypeSequence: true,
  avoidSameCenterSequence: true,
  maxSameCenterInARow: 2,
  mixPositiveAndShadowItems: true
}
```

## 10. Normalização da pontuação

Como cada tipo deve ter o mesmo número de perguntas, o cálculo fica simples.

```ts
function normalizeScore(rawScore, maxScore) {
  return Math.round((rawScore / maxScore) * 100);
}
```

Mas o sistema deve suportar pesos.

```ts
function calculateTypeScores(answers, questions) {
  const rawScores = {};
  const maxScores = {};

  for (let type = 1; type <= 9; type++) {
    rawScores[type] = 0;
    maxScores[type] = 0;
  }

  for (const question of questions) {
    const answer = answers[question.id];

    if (answer === undefined || answer === null) continue;

    const value = question.polarity === "reverse"
      ? 5 - answer
      : answer;

    const weightedValue = value * question.weight;
    const weightedMax = 5 * question.weight;

    rawScores[question.type] += weightedValue;
    maxScores[question.type] += weightedMax;
  }

  const normalizedScores = {};

  for (let type = 1; type <= 9; type++) {
    normalizedScores[type] = normalizeScore(rawScores[type], maxScores[type]);
  }

  return {
    rawScores,
    maxScores,
    normalizedScores
  };
}
```

## 11. Tipo principal

```ts
function calculatePrimaryType(normalizedScores) {
  const sorted = Object.entries(normalizedScores)
    .map(([type, score]) => ({
      type: Number(type),
      score
    }))
    .sort((a, b) => b.score - a.score);

  const first = sorted[0];
  const second = sorted[1];

  const gap = first.score - second.score;

  let confidence = "baixa";

  if (gap >= 12) confidence = "alta";
  else if (gap >= 6) confidence = "média";
  else confidence = "baixa";

  return {
    primaryType: first.type,
    primaryScore: first.score,
    secondType: second.type,
    secondScore: second.score,
    gap,
    confidence,
    technicalTie: gap < 6
  };
}
```

## 12. Regra para empate técnico

Empate técnico acontece quando a diferença entre o primeiro e o segundo tipo é menor que 6 pontos normalizados.

```ts
function resolveTechnicalTie(primary, secondary, normalizedScores) {
  const areAdjacent = WINGS[primary].includes(secondary);

  const areConnectedByLine =
    GROWTH_LINES[primary] === secondary ||
    STRESS_LINES[primary] === secondary;

  const sameCenter =
    ENNEAGRAM_TYPES[primary].center === ENNEAGRAM_TYPES[secondary].center;

  if (areAdjacent) {
    return {
      interpretation: "O segundo tipo provavelmente aparece como asa forte.",
      action: "usar wing como hipótese principal"
    };
  }

  if (areConnectedByLine) {
    return {
      interpretation: "O segundo tipo pode indicar movimento de crescimento ou estresse.",
      action: "comparar com contexto de vida atual"
    };
  }

  if (sameCenter) {
    return {
      interpretation: "Há uma disputa dentro do mesmo centro de inteligência.",
      action: "usar perguntas de medo, desejo e defesa como desempate"
    };
  }

  return {
    interpretation: "Resultado misto entre estruturas diferentes.",
    action: "sinalizar baixa confiança e sugerir validação qualitativa"
  };
}
```

## 13. Centro dominante

```ts
function calculateCenterScores(normalizedScores) {
  const centerScores = {};

  for (const [centerKey, center] of Object.entries(ENNEAGRAM_CENTERS)) {
    const total = center.types.reduce((sum, type) => {
      return sum + normalizedScores[type];
    }, 0);

    centerScores[centerKey] = Math.round(total / center.types.length);
  }

  const sortedCenters = Object.entries(centerScores)
    .map(([center, score]) => ({ center, score }))
    .sort((a, b) => b.score - a.score);

  return {
    centerScores,
    dominantCenter: sortedCenters[0].center,
    centerOrder: sortedCenters
  };
}
```

## 14. Trifix ou tipo dominante por centro

Não precisa chamar de “tritype” na interface, para evitar discussão conceitual. Pode chamar de:

```ts
"Tríade Religare"
```

Ou:

```ts
"Mapa dos 3 Centros"
```

Cálculo:

```ts
function calculateCenterDominantTypes(normalizedScores) {
  const result = {};

  for (const [centerKey, center] of Object.entries(ENNEAGRAM_CENTERS)) {
    const sortedTypes = center.types
      .map(type => ({
        type,
        score: normalizedScores[type]
      }))
      .sort((a, b) => b.score - a.score);

    result[centerKey] = sortedTypes[0];
  }

  return {
    instinctive: result.instinctive,
    feeling: result.feeling,
    thinking: result.thinking,
    code: `${result.instinctive.type}${result.feeling.type}${result.thinking.type}`
  };
}
```

Exemplo:

```ts
{
  instinctive: { type: 9, score: 88 },
  feeling: { type: 4, score: 76 },
  thinking: { type: 5, score: 81 },
  code: "945"
}
```

## 15. Indicadores de validade

O sistema deve medir qualidade da resposta.

```ts
function calculateValidity(answers, questions) {
  const values = Object.values(answers);

  const answeredCount = values.filter(v => v !== null && v !== undefined).length;
  const completionRate = answeredCount / questions.length;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;

  const sameAnswerRisk = variance < 0.35;
  const extremeAnswerRisk = average <= 0.8 || average >= 4.2;

  let validity = "boa";

  if (completionRate < 1) validity = "incompleta";
  else if (sameAnswerRisk || extremeAnswerRisk) validity = "questionável";

  return {
    completionRate,
    average,
    variance,
    sameAnswerRisk,
    extremeAnswerRisk,
    validity
  };
}
```

### Interpretação

```ts
const VALIDITY_MESSAGES = {
  boa: "As respostas parecem suficientemente variadas para gerar uma leitura indicativa.",
  questionável: "As respostas apresentaram padrão muito uniforme ou extremo. O resultado deve ser lido com cautela.",
  incompleta: "O questionário não foi completamente respondido."
}
```

## 16. Resultado final do Eneagrama

```ts
function calculateEnneagramResult(answers, questions) {
  const scores = calculateTypeScores(answers, questions);
  const primary = calculatePrimaryType(scores.normalizedScores);
  const wing = calculateWing(primary.primaryType, scores.normalizedScores);
  const centers = calculateCenterScores(scores.normalizedScores);
  const centerDominants = calculateCenterDominantTypes(scores.normalizedScores);
  const validity = calculateValidity(answers, questions);

  const growthType = GROWTH_LINES[primary.primaryType];
  const stressType = STRESS_LINES[primary.primaryType];

  const tieResolution = primary.technicalTie
    ? resolveTechnicalTie(primary.primaryType, primary.secondType, scores.normalizedScores)
    : null;

  return {
    primaryType: primary.primaryType,
    primaryName: ENNEAGRAM_TYPES[primary.primaryType].title,
    primaryAlternativeTitle: ENNEAGRAM_TYPES[primary.primaryType].alternativeTitle,
    primaryScore: primary.primaryScore,

    secondType: primary.secondType,
    secondScore: primary.secondScore,
    gap: primary.gap,
    confidence: primary.confidence,
    technicalTie: primary.technicalTie,
    tieResolution,

    wing,
    center: centers.dominantCenter,
    centerScores: centers.centerScores,
    centerOrder: centers.centerOrder,
    centerDominants,

    growthLine: {
      type: growthType,
      name: ENNEAGRAM_TYPES[growthType].title
    },
    stressLine: {
      type: stressType,
      name: ENNEAGRAM_TYPES[stressType].title
    },

    allTypeScores: scores.normalizedScores,
    validity
  };
}
```

## 17. Output recomendado para o Religare

```ts
type ReligareEnneagramOutput = {
  module: "enneagram";
  version: "1.0.0";
  result: {
    primaryType: number;
    primaryName: string;
    wing: string | null;
    center: string;
    confidence: "baixa" | "média" | "alta";
    technicalTie: boolean;
    growthLine: number;
    stressLine: number;
    centerDominants: {
      instinctive: number;
      feeling: number;
      thinking: number;
    };
    allTypeScores: Record<number, number>;
    validity: {
      validity: "boa" | "questionável" | "incompleta";
      completionRate: number;
      average: number;
      variance: number;
    };
  };
}
```

## 18. Camada de interpretação

Separar cálculo de interpretação.

```ts
const enneagramCalculation = calculateEnneagramResult(answers, questions);
const enneagramInterpretation = generateReligareInterpretation(enneagramCalculation);
```

A camada de cálculo deve ser objetiva:

```ts
Tipo 4
Asa 5
Centro emocional
Crescimento em 1
Estresse em 2
Confiança média
```

A camada interpretativa pode traduzir isso em linguagem Religare:

```ts
Sua personalidade parece buscar autenticidade, profundidade e identidade própria.
Quando amadurece, tende a ganhar mais estrutura, discernimento e ação correta.
Sob pressão, pode buscar validação afetiva ou se perder em reatividade relacional.
```

## 19. Integração com arquétipos de marca

O Eneagrama não deve determinar sozinho os arquétipos de marca.

Ele deve gerar pistas.

```ts
const ENNEAGRAM_TO_BRAND_ARCHETYPE_PRIORS = {
  1: ["Sábio", "Governante", "Cuidador"],
  2: ["Cuidador", "Amante", "Inocente"],
  3: ["Herói", "Governante", "Mago"],
  4: ["Criador", "Amante", "Mago"],
  5: ["Sábio", "Mago", "Explorador"],
  6: ["Cuidador", "Cara Comum", "Governante"],
  7: ["Explorador", "Bobo", "Criador"],
  8: ["Herói", "Governante", "Fora da Lei"],
  9: ["Inocente", "Cuidador", "Cara Comum"]
}
```

### Peso recomendado no cálculo final dos arquétipos

```ts
const BRAND_ARCHETYPE_WEIGHTING = {
  enneagramPrior: 0.30,
  ikigaiMotivation: 0.25,
  vocationalProfile: 0.20,
  directBrandQuestions: 0.20,
  numerologySymbolicLayer: 0.05
}
```

Assim, se uma pessoa der Tipo 4, o sistema não conclui automaticamente “Criador”. Ele apenas aumenta a probabilidade de Criador, Amante e Mago, aguardando validação dos outros blocos.

## 20. Integração com Ikigai

O Eneagrama responde principalmente:

```ts
"Por que eu faço o que faço?"
```

O Ikigai responde:

```ts
"Onde minha energia, talento, serviço e valor se encontram?"
```

Cruzamento recomendado:

```ts
const IKIGAI_ENNEAGRAM_CROSSCHECK = {
  type1: "propósito orientado a melhoria, ética, método e correção",
  type2: "propósito orientado a cuidado, vínculo, suporte e serviço",
  type3: "propósito orientado a realização, performance, influência e resultado",
  type4: "propósito orientado a autenticidade, expressão, beleza e sentido",
  type5: "propósito orientado a conhecimento, domínio técnico e profundidade",
  type6: "propósito orientado a segurança, confiança, comunidade e prevenção",
  type7: "propósito orientado a possibilidades, liberdade, movimento e entusiasmo",
  type8: "propósito orientado a autonomia, proteção, impacto e liderança",
  type9: "propósito orientado a harmonia, mediação, presença e estabilidade"
}
```

## 21. Integração com teste vocacional reduzido

Recomendo usar uma base RIASEC para o teste vocacional reduzido.

```ts
const RIASEC = {
  R: "Realista",
  I: "Investigativo",
  A: "Artístico",
  S: "Social",
  E: "Empreendedor",
  C: "Convencional"
}
```

Cruzamento indicativo:

```ts
const ENNEAGRAM_RIASEC_HINTS = {
  1: ["C", "S", "E"],
  2: ["S", "A", "E"],
  3: ["E", "S", "C"],
  4: ["A", "S", "I"],
  5: ["I", "C", "A"],
  6: ["C", "S", "I"],
  7: ["E", "A", "S"],
  8: ["E", "R", "S"],
  9: ["S", "A", "C"]
}
```

Não usar esse cruzamento como resultado final. Usar como coerência de leitura.

## 22. Integração com Numerologia Cabalística

A Numerologia Cabalística deve ser calculada principalmente por:

```ts
nomeCompleto
dataNascimento
nomeSocialOuArtístico
```

As 5 perguntas reservadas para numerologia devem servir apenas para calibrar:

1. Como a pessoa se reconhece no próprio nome.
2. Como ela sente sua missão atual.
3. Como ela percebe desafios recorrentes.
4. Como ela se posiciona diante de mudanças.
5. Como ela deseja ser chamada ou apresentada.

Regra:

```ts
Numerologia não deve competir com Eneagrama.
Numerologia deve funcionar como camada simbólica de confirmação ou contraste.
```

## 23. Estrutura recomendada do banco

### Tabela questions

```ts
{
  id: string;
  module: "enneagram" | "ikigai" | "vocational" | "brand_archetype" | "numerology";
  text: string;
  scaleMin: number;
  scaleMax: number;
  metadata: {
    enneagramType?: number;
    facet?: string;
    polarity?: "direct" | "reverse";
    weight?: number;
    center?: string;
  };
  active: boolean;
  version: string;
}
```

### Tabela answers

```ts
{
  id: string;
  userId: string;
  sessionId: string;
  questionId: string;
  value: number;
  createdAt: string;
}
```

### Tabela results

```ts
{
  id: string;
  userId: string;
  sessionId: string;
  module: string;
  version: string;
  resultJson: object;
  confidence: string;
  createdAt: string;
}
```

## 24. Exemplo de resultado

```ts
{
  module: "enneagram",
  version: "1.0.0",
  result: {
    primaryType: 4,
    primaryName: "O Individualista",
    primaryAlternativeTitle: "O Romântico",
    primaryScore: 86,

    secondType: 5,
    secondScore: 79,
    gap: 7,
    confidence: "média",
    technicalTie: false,

    wing: {
      wing: 5,
      label: "4w5",
      confidence: "média"
    },

    center: "feeling",
    centerScores: {
      instinctive: 42,
      feeling: 78,
      thinking: 69
    },

    centerDominants: {
      instinctive: { type: 9, score: 58 },
      feeling: { type: 4, score: 86 },
      thinking: { type: 5, score: 79 },
      code: "945"
    },

    growthLine: {
      type: 1,
      name: "O Reformador"
    },

    stressLine: {
      type: 2,
      name: "O Ajudante"
    },

    allTypeScores: {
      1: 55,
      2: 62,
      3: 38,
      4: 86,
      5: 79,
      6: 66,
      7: 44,
      8: 31,
      9: 58
    },

    validity: {
      validity: "boa",
      completionRate: 1,
      average: 3.1,
      variance: 1.4
    }
  }
}
```

## 25. Checklist anti bug

1. Não somar tudo em uma pontuação única.
2. Não usar blocos visíveis por tipo no questionário final.
3. Não deixar tipos com quantidades diferentes de perguntas sem normalização.
4. Não calcular asa olhando apenas o segundo maior tipo geral.
5. Asa deve ser calculada apenas entre os dois tipos vizinhos do tipo principal.
6. Não tratar empate técnico como certeza.
7. Se diferença entre primeiro e segundo tipo for menor que 6 pontos, sinalizar baixa confiança.
8. Separar tipo principal, asa, centro, linhas e tríade dos centros.
9. Não usar o Eneagrama sozinho para arquétipo de marca.
10. Usar escala 0 a 5 em todos os blocos do questionário para padronizar o motor.
11. Calcular validade das respostas.
12. Separar cálculo objetivo de interpretação simbólica.
13. Salvar versão do questionário e versão do algoritmo.
14. Permitir recalcular resultados se perguntas forem atualizadas.
15. Exibir o resultado como hipótese de autoconhecimento, não como sentença.

````

## Próximo passo recomendado

Quando formos criar as 100 perguntas, eu manteria esta proporção como base fixa:

```txt
Perguntas 01 a 45: Eneagrama
Perguntas 46 a 65: Ikigai
Perguntas 66 a 83: Vocacional reduzido
Perguntas 84 a 95: Arquétipos de Marca
Perguntas 96 a 100: Calibragem Numerológica
````

E na experiência do usuário, eu não mostraria esses blocos separados. Mostraria como uma única travessia do Religare, com perguntas misturadas por tema, para reduzir enviesamento e deixar o diagnóstico mais orgânico.

[1]: https://github.com/acguardia/eneagrama "GitHub - acguardia/eneagrama: Teste de Eneagrama · GitHub"
[2]: https://www.enneagraminstitute.com/how-the-enneagram-system-works/ "How The Enneagram System Works - The Enneagram Institute"
[3]: https://www.integrative9.com/enneagram/ "What is the Enneagram"
