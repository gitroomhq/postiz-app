# Ajuste estratégico do questionário Religare

A melhor solução é **remover as 5 perguntas de calibragem numerológica** do bloco psicométrico e transformar a Numerologia em **campo automático calculado por dados pessoais**.

Assim, mantemos as 100 perguntas limpas e ganhamos uma base terapêutica breve.

## Nova distribuição

| Bloco                            | Perguntas | Função                                             |
| -------------------------------- | --------: | -------------------------------------------------- |
| Eneagrama                        |        45 | Personalidade, motivação, sombra, asa, centro      |
| Ikigai                           |        20 | Vocação, prazer, talento, serviço e valor          |
| Vocacional reduzido              |        18 | Perfil de atuação, base RIASEC                     |
| Arquétipos de Marca Pessoal      |        12 | Expressão pública, posicionamento e assinatura     |
| Contexto terapêutico integrativo |         5 | Desafios, padrões, obstáculos e prioridades atuais |
| **Total**                        |   **100** |                                                    |

A **Numerologia** entra como cálculo automático a partir de:

| Campo                    | Obrigatório | Uso                                                                       |
| ------------------------ | ----------- | ------------------------------------------------------------------------- |
| Nome completo            | Sim         | Base principal da numerologia                                             |
| Nome social ou artístico | Opcional    | Expressão pública, assinatura e marca pessoal                             |
| Data de nascimento       | Sim         | Ano pessoal, ciclos e cruzamento com Tzolkin, astrologia e desenho humano |
| Ano pessoal              | Automático  | Ciclo numerológico atual                                                  |

---

# Bloco ajustado: Contexto Terapêutico Integrativo

Essas perguntas não devem gerar um “tipo” fechado. Elas funcionam como **anamnese breve**, criando tags para aprofundamento em sessão, relatório e cruzamentos com os demais módulos.

## Substituir o antigo bloco N01 a N05 por C01 a C05

| ID  | Eixo                  | Pergunta                                                                                                             | Tags possíveis                            |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| C01 | desafio atual         | Hoje, sinto que existe um desafio recorrente que vem consumindo minha energia, clareza ou presença.                  | desafio, carga emocional, repetição       |
| C02 | padrão autossabotador | Percebo que alguns padrões meus me afastam daquilo que digo querer construir, viver ou expressar.                    | autossabotagem, incoerência, repetição    |
| C03 | obstáculo interno     | Muitas vezes, o maior obstáculo não parece estar fora, mas na forma como eu reajo, evito, adio ou interpreto a vida. | resistência interna, defesa, bloqueio     |
| C04 | busca atual           | Neste momento, estou buscando mais clareza sobre quem sou, o que quero e qual direção faz sentido para minha vida.   | clareza, identidade, direção              |
| C05 | prioridade de vida    | Existe uma área da minha vida que pede prioridade, cuidado ou reorganização agora.                                   | prioridade, foco terapêutico, ciclo atual |

---

# Ajuste no bloco de Arquétipos

Trocar o nome do bloco para:

```txt
Arquétipos de Marca Pessoal
```

Descrição do bloco:

```txt
Este bloco identifica os arquétipos mais fortes na forma como a pessoa tende a expressar sua presença, sua comunicação, sua autoridade e sua assinatura pública.

O resultado pode ser aplicado à marca pessoal e, quando a empresa depende diretamente da imagem, voz ou energia do creator, também pode orientar a comunicação da empresa.
```

## Perguntas ajustadas

| ID  | Arquétipo   | Pergunta                                                                                                             |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| A01 | Inocente    | Minha presença pública ideal deveria transmitir leveza, simplicidade, confiança e esperança.                         |
| A02 | Sábio       | Minha presença pública ideal deveria transmitir conhecimento, clareza, discernimento e profundidade.                 |
| A03 | Explorador  | Minha presença pública ideal deveria transmitir liberdade, descoberta, movimento e expansão.                         |
| A04 | Fora da Lei | Minha presença pública ideal deveria questionar padrões, romper convenções e provocar mudança.                       |
| A05 | Mago        | Minha presença pública ideal deveria transformar percepções, revelar possibilidades e criar experiências memoráveis. |
| A06 | Herói       | Minha presença pública ideal deveria inspirar coragem, superação, ação e conquista.                                  |
| A07 | Amante      | Minha presença pública ideal deveria despertar conexão, beleza, sensibilidade, desejo e presença.                    |
| A08 | Bobo        | Minha presença pública ideal deveria trazer humor, espontaneidade, prazer e leveza social.                           |
| A09 | Cara Comum  | Minha presença pública ideal deveria gerar identificação, proximidade, pertencimento e simplicidade humana.          |
| A10 | Cuidador    | Minha presença pública ideal deveria acolher, proteger, nutrir, apoiar e oferecer segurança emocional.               |
| A11 | Governante  | Minha presença pública ideal deveria transmitir liderança, ordem, excelência, autoridade e sofisticação.             |
| A12 | Criador     | Minha presença pública ideal deveria expressar originalidade, imaginação, estética, autoria e visão própria.         |

---

# Numerologia como dados do sistema

## Campos de entrada

```ts
type NumerologyInput = {
  fullName: string;
  publicName?: string;
  birthDate: string;
  currentYear: number;
}
```

## Campos calculados

```ts
type NumerologyOutput = {
  fullNameBase: string;
  publicNameBase?: string;
  birthDate: string;
  personalYear: number;
  currentCycle: string;
  interpretationTags: string[];
}
```

## Ano pessoal

Fórmula simples para o sistema:

```ts
function reduceNumber(n: number): number {
  while (n > 9 && n !== 11 && n !== 22) {
    n = String(n)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }

  return n;
}

function calculatePersonalYear(day: number, month: number, year: number): number {
  const sum = day + month + year;
  return reduceNumber(sum);
}
```

Exemplo:

```ts
calculatePersonalYear(11, 12, 2026)
```

Base:

```txt
11 + 12 + 2026 = 2049
2 + 0 + 4 + 9 = 15
1 + 5 = 6

Ano pessoal: 6
```

---

# Ordem final atualizada para exibição

Substituí os antigos N01, N02, N03, N04 e N05 por C01, C02, C03, C04 e C05.

```txt
01 E21
02 I01
03 V04
04 A02
05 E36
06 I11
07 V13
08 E06
09 C01
10 E31
11 A05
12 V07
13 E01
14 I06
15 E16
16 V10
17 A12
18 E26
19 I16
20 E41
21 V16
22 E11
23 A10
24 C02
25 E22
26 I02
27 V05
28 E37
29 A11
30 E07
31 I12
32 V14
33 E32
34 A03
35 E02
36 I07
37 V08
38 E17
39 A07
40 E27
41 I17
42 V11
43 E42
44 A09
45 E12
46 C03
47 E23
48 I03
49 V06
50 E38
51 A06
52 E08
53 I13
54 V15
55 E33
56 A08
57 E03
58 I08
59 V09
60 E18
61 A04
62 E28
63 I18
64 V12
65 E43
66 A01
67 E13
68 C04
69 E24
70 I04
71 V01
72 E39
73 E09
74 I14
75 V02
76 E34
77 E04
78 I09
79 V03
80 E19
81 E29
82 I19
83 V17
84 E44
85 E14
86 C05
87 E25
88 I05
89 E40
90 E10
91 I15
92 E35
93 E05
94 I10
95 E20
96 E30
97 I20
98 V18
99 E45
100 E15
```

---

# Integrações recomendadas entre resultados

## 1. Eneagrama + Contexto Terapêutico

| Padrão                 | Leitura integrativa                                                            |
| ---------------------- | ------------------------------------------------------------------------------ |
| Tipo 1 alto + C02 alto | Autossabotagem por rigidez, perfeccionismo ou autocobrança                     |
| Tipo 2 alto + C01 alto | Desgaste por excesso de disponibilidade e dificuldade de pedir apoio           |
| Tipo 3 alto + C03 alto | Obstáculo interno ligado à performance, imagem e dificuldade de pausar         |
| Tipo 4 alto + C04 alto | Busca de identidade, sentido e expressão autêntica                             |
| Tipo 5 alto + C03 alto | Retração, excesso de análise ou proteção energética                            |
| Tipo 6 alto + C01 alto | Ansiedade antecipatória, medo de instabilidade ou busca por segurança          |
| Tipo 7 alto + C02 alto | Autossabotagem por dispersão, fuga do desconforto ou excesso de possibilidades |
| Tipo 8 alto + C03 alto | Defesa por controle, intensidade ou resistência à vulnerabilidade              |
| Tipo 9 alto + C05 alto | Prioridade em ação, escolha, posicionamento e saída da inércia                 |

## 2. Ikigai + Prioridade de Vida

| Resultado                        | Correlação                                                         |
| -------------------------------- | ------------------------------------------------------------------ |
| Amor baixo + C04 alto            | A pessoa busca direção, mas perdeu contato com vitalidade e desejo |
| Talento alto + Remuneração baixo | Existe potencial, mas falta estrutura de oferta                    |
| Serviço alto + C01 alto          | Pode haver sobrecarga por servir demais sem organização            |
| Remuneração alto + C05 alto      | Momento favorável para profissionalizar uma entrega                |

## 3. Vocacional + Arquétipo de Marca Pessoal

| Perfil vocacional | Arquétipos que costumam combinar |
| ----------------- | -------------------------------- |
| Realista          | Herói, Governante, Cara Comum    |
| Investigativo     | Sábio, Mago, Explorador          |
| Artístico         | Criador, Amante, Mago            |
| Social            | Cuidador, Inocente, Amante       |
| Empreendedor      | Herói, Governante, Fora da Lei   |
| Convencional      | Governante, Sábio, Cuidador      |

## 4. Eneagrama + Arquétipo de Marca Pessoal

| Tipo | Arquétipos prováveis             |
| ---- | -------------------------------- |
| 1    | Sábio, Governante, Cuidador      |
| 2    | Cuidador, Amante, Inocente       |
| 3    | Herói, Governante, Mago          |
| 4    | Criador, Amante, Mago            |
| 5    | Sábio, Mago, Explorador          |
| 6    | Cuidador, Cara Comum, Governante |
| 7    | Explorador, Bobo, Criador        |
| 8    | Herói, Governante, Fora da Lei   |
| 9    | Inocente, Cuidador, Cara Comum   |

## 5. Numerologia + Ciclo Atual

A Numerologia deve funcionar como camada de ciclo, não como substituta dos testes.

| Ano pessoal | Uso no relatório                                   |
| ----------: | -------------------------------------------------- |
|           1 | Início, autonomia, identidade, coragem de começar  |
|           2 | Parcerias, sensibilidade, escuta, vínculos         |
|           3 | Comunicação, expressão, criatividade, visibilidade |
|           4 | Estrutura, disciplina, organização, base           |
|           5 | Mudança, liberdade, movimento, expansão            |
|           6 | Cuidado, família, responsabilidade, harmonia       |
|           7 | Introspecção, estudo, espiritualidade, refinamento |
|           8 | Poder, dinheiro, realização, gestão                |
|           9 | Encerramento, síntese, desapego, transição         |

---

# Schema final recomendado

```ts
type ReligareQuestionnaireResult = {
  personalData: {
    fullName: string;
    publicName?: string;
    birthDate: string;
    timezone: string;
  };

  calculatedSystems: {
    numerology: {
      personalYear: number;
      nameNumbers?: Record<string, number>;
    };
    tzolkin?: object;
    astrology?: object;
    humanDesign?: object;
  };

  questionnaire: {
    enneagram: object;
    ikigai: object;
    vocational: object;
    personalBrandArchetypes: object;
    therapeuticContext: {
      challengesScore: number;
      selfSabotageScore: number;
      innerObstacleScore: number;
      currentSearchScore: number;
      lifePriorityScore: number;
      dominantTags: string[];
    };
  };

  integrativeReading: {
    mainPatterns: string[];
    growthHypotheses: string[];
    sessionFocusSuggestions: string[];
    brandExpressionSuggestions: string[];
  };
}
```

## Ajuste final de nomenclatura para o usuário

| Interno                          | Nome visível                |
| -------------------------------- | --------------------------- |
| Numerologia Cabalística          | Numerologia                 |
| Arquétipos de Marca              | Arquétipos de Marca Pessoal |
| Contexto Terapêutico Integrativo | Momento Atual               |
| Eneagrama                        | Eneagrama                   |
| Ikigai                           | Ikigai                      |
| RIASEC                           | Tendências Vocacionais      |

Esse ajuste deixa o questionário mais fluido e evita que a experiência pareça excessivamente técnica.
