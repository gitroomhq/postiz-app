A base abaixo está calibrada para o padrão Dreamspell / Sincronário das 13 Luas, não para a contagem maia tradicional Long Count. O ponto crítico para bater com os sites é este: **26/07/1987 = Kin 34, Mago Galáctico Branco**, e **29/02 não avança a contagem do Kin**, sendo tratado como 0.0 Hunab Ku. Isso é confirmado pela Foundation for the Law of Time, que registra a calibração em 26/07/1987 e informa que o leap day não é reconhecido na contagem, sendo 29/02 contado como 0.0 Hunab Ku. ([Fundação para a Lei do Tempo][1])

Também validei o match prático: em **01/07/2026**, tanto o Sincronário da Paz quanto o Sincronário exibem **Kin 204, Semente Solar Amarela**, com o mantra “Pulso com o fim de focalizar...” e guia pelo poder do fogo universal. ([Sincronário da Paz][2])

A estrutura 13 x 20 = 260, com 13 Tons Galácticos e 20 Selos Solares, também é a base descrita pelo tzolkin.io. ([Tzolkin][3]) Para onda encantada, a regra é voltar até o Kin de tom Magnético, pois a onda é nomeada pelo primeiro selo da sequência de 13 kins. ([Tzolkin][4]) Para o oráculo, as regras de análogo, antípoda, oculto e guia seguem as fórmulas descritas pelo tzolkin.io. ([Tzolkin][5])

````md
# Base de Cálculo Tzolkin | Religare Vocaccio

## 1. Padrão adotado

Este sistema usa o padrão Dreamspell / Encantamento do Sonho / Sincronário das 13 Luas.

Não usar a contagem maia tradicional Long Count como base principal, pois ela pode gerar divergência de Kin.

Base de calibração:

```ts
ANCHOR_DATE = "1987-07-26"
ANCHOR_KIN = 34
ANCHOR_SIGNATURE = "Mago Galáctico Branco"
````

Regra essencial:

```ts
29/02 não avança a contagem do Kin.
```

Em anos bissextos, o dia 29/02 deve ser tratado como `0.0 Hunab Ku`. Para manter compatibilidade prática, o sistema pode retornar o mesmo Kin de 28/02, mas deve marcar `isLeapDayZero = true`.

## 2. Fuso horário

Antes de calcular o Kin, sempre resolver a data civil no fuso escolhido.

Regra recomendada:

```ts
timezoneDefault = "America/Sao_Paulo"
```

Para data de nascimento:

```ts
Se o usuário informou apenas dia, mês e ano:
usar a data exatamente como informada.

Se o usuário informou data e hora:
converter o timestamp para o fuso desejado antes de extrair o YYYY-MM-DD.
```

Exemplo:

```ts
timestampUtc = "2026-07-02T02:30:00Z"
timezone = "America/Sao_Paulo"

localDate = "2026-07-01"
kin = 204
```

## 3. Cálculo do Kin por data

### Fórmula conceitual

1. Resolver a data local.
2. Calcular a diferença de dias entre a data local e 26/07/1987.
3. Subtrair os dias 29/02 atravessados no caminho.
4. Somar esse deslocamento ao Kin 34.
5. Aplicar módulo 260.

### Fórmula

```ts
kin = mod1(ANCHOR_KIN + dreamspellDayOffset, 260)
```

Onde:

```ts
mod1(n, base) = ((n - 1) % base + base) % base + 1
```

### Pseudocódigo

```ts
function mod1(n: number, base: number): number {
  return ((n - 1) % base + base) % base + 1;
}

function isLeapDay(date: LocalDate): boolean {
  return date.month === 2 && date.day === 29;
}

function dreamspellDayOffset(targetDate: LocalDate): number {
  const anchor = LocalDate.from("1987-07-26");

  if (targetDate.equals(anchor)) return 0;

  const direction = targetDate > anchor ? 1 : -1;
  let current = anchor;
  let offset = 0;

  while (!current.equals(targetDate)) {
    current = current.plusDays(direction);

    if (!isLeapDay(current)) {
      offset += direction;
    }
  }

  return offset;
}

function kinFromDate(targetDate: LocalDate): number {
  const offset = dreamspellDayOffset(targetDate);
  return mod1(34 + offset, 260);
}
```

## 4. Testes obrigatórios

Estes testes precisam bater.

```ts
1987-07-26 => Kin 34, Mago Galáctico Branco
1987-12-11 => Kin 172, Humano Elétrico Amarelo
2026-07-01 => Kin 204, Semente Solar Amarela
2026-07-02 => Kin 205, Serpente Planetária Vermelha
```

Teste de 29/02:

```ts
1988-02-28 => Kin 251
1988-02-29 => Kin 251, isLeapDayZero: true
1988-03-01 => Kin 252
```

## 5. Cálculo de Tom e Selo pelo número Kin

```ts
toneNumber = ((kin - 1) % 13) + 1
sealNumber = ((kin - 1) % 20) + 1
```

Exemplo:

```ts
kin = 204

toneNumber = 9
sealNumber = 4

Resultado:
Semente Solar Amarela
```

## 6. Tons Galácticos

```ts
const TONES = [
  {
    number: 1,
    name: "Magnético",
    power: "Unificar",
    action: "Atrair",
    essence: "Propósito",
    mantraAction: "Unifico",
    mantraGerund: "Atraindo"
  },
  {
    number: 2,
    name: "Lunar",
    power: "Polarizar",
    action: "Estabilizar",
    essence: "Desafio",
    mantraAction: "Polarizo",
    mantraGerund: "Estabilizando"
  },
  {
    number: 3,
    name: "Elétrico",
    power: "Ativar",
    action: "Vincular",
    essence: "Serviço",
    mantraAction: "Ativo",
    mantraGerund: "Vinculando"
  },
  {
    number: 4,
    name: "Autoexistente",
    power: "Definir",
    action: "Medir",
    essence: "Forma",
    mantraAction: "Defino",
    mantraGerund: "Medindo"
  },
  {
    number: 5,
    name: "Harmônico",
    power: "Potencializar",
    action: "Comandar",
    essence: "Radiação",
    mantraAction: "Potencializo",
    mantraGerund: "Comandando"
  },
  {
    number: 6,
    name: "Rítmico",
    power: "Organizar",
    action: "Equilibrar",
    essence: "Igualdade",
    mantraAction: "Organizo",
    mantraGerund: "Equilibrando"
  },
  {
    number: 7,
    name: "Ressonante",
    power: "Canalizar",
    action: "Inspirar",
    essence: "Sintonização",
    mantraAction: "Canalizo",
    mantraGerund: "Inspirando"
  },
  {
    number: 8,
    name: "Galáctico",
    power: "Harmonizar",
    action: "Modelar",
    essence: "Integridade",
    mantraAction: "Harmonizo",
    mantraGerund: "Modelando"
  },
  {
    number: 9,
    name: "Solar",
    power: "Pulsar",
    action: "Realizar",
    essence: "Intenção",
    mantraAction: "Pulso",
    mantraGerund: "Realizando"
  },
  {
    number: 10,
    name: "Planetário",
    power: "Aperfeiçoar",
    action: "Produzir",
    essence: "Manifestação",
    mantraAction: "Aperfeiçoo",
    mantraGerund: "Produzindo"
  },
  {
    number: 11,
    name: "Espectral",
    power: "Dissolver",
    action: "Libertar",
    essence: "Liberação",
    mantraAction: "Dissolvo",
    mantraGerund: "Libertando"
  },
  {
    number: 12,
    name: "Cristal",
    power: "Dedicar",
    action: "Universalizar",
    essence: "Cooperação",
    mantraAction: "Dedico-me",
    mantraGerund: "Universalizando"
  },
  {
    number: 13,
    name: "Cósmico",
    power: "Perseverar",
    action: "Transcender",
    essence: "Presença",
    mantraAction: "Persevero",
    mantraGerund: "Transcendendo"
  }
]
```

## 7. Selos Solares

```ts
const SEALS = [
  {
    number: 1,
    name: "Dragão",
    color: "Vermelho",
    action: "nutrir",
    power: "nascimento",
    essence: "ser",
    essenceArticle: "o",
    powerArticle: "do",
    chamber: "entrada",
    chamberArticle: "a"
  },
  {
    number: 2,
    name: "Vento",
    color: "Branco",
    action: "comunicar",
    power: "espírito",
    essence: "alento",
    essenceArticle: "o",
    powerArticle: "do",
    chamber: "entrada",
    chamberArticle: "a"
  },
  {
    number: 3,
    name: "Noite",
    color: "Azul",
    action: "sonhar",
    power: "abundância",
    essence: "intuição",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "entrada",
    chamberArticle: "a"
  },
  {
    number: 4,
    name: "Semente",
    color: "Amarelo",
    action: "focalizar",
    power: "florescimento",
    essence: "percepção",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "entrada",
    chamberArticle: "a"
  },
  {
    number: 5,
    name: "Serpente",
    color: "Vermelho",
    action: "sobreviver",
    power: "força vital",
    essence: "instinto",
    essenceArticle: "o",
    powerArticle: "da",
    chamber: "armazém",
    chamberArticle: "o"
  },
  {
    number: 6,
    name: "Enlaçador de Mundos",
    color: "Branco",
    action: "igualar",
    power: "morte",
    essence: "oportunidade",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "armazém",
    chamberArticle: "o"
  },
  {
    number: 7,
    name: "Mão",
    color: "Azul",
    action: "conhecer",
    power: "realização",
    essence: "cura",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "armazém",
    chamberArticle: "o"
  },
  {
    number: 8,
    name: "Estrela",
    color: "Amarelo",
    action: "embelezar",
    power: "elegância",
    essence: "arte",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "armazém",
    chamberArticle: "o"
  },
  {
    number: 9,
    name: "Lua",
    color: "Vermelho",
    action: "purificar",
    power: "água universal",
    essence: "fluxo",
    essenceArticle: "o",
    powerArticle: "da",
    chamber: "processo",
    chamberArticle: "o"
  },
  {
    number: 10,
    name: "Cachorro",
    color: "Branco",
    action: "amar",
    power: "coração",
    essence: "lealdade",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "processo",
    chamberArticle: "o"
  },
  {
    number: 11,
    name: "Macaco",
    color: "Azul",
    action: "brincar",
    power: "magia",
    essence: "ilusão",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "processo",
    chamberArticle: "o"
  },
  {
    number: 12,
    name: "Humano",
    color: "Amarelo",
    action: "influenciar",
    power: "livre-arbítrio",
    essence: "sabedoria",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "processo",
    chamberArticle: "o"
  },
  {
    number: 13,
    name: "Caminhante do Céu",
    color: "Vermelho",
    action: "explorar",
    power: "espaço",
    essence: "vigilância",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "saída",
    chamberArticle: "a"
  },
  {
    number: 14,
    name: "Mago",
    color: "Branco",
    action: "encantar",
    power: "intemporalidade",
    essence: "receptividade",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "saída",
    chamberArticle: "a"
  },
  {
    number: 15,
    name: "Águia",
    color: "Azul",
    action: "criar",
    power: "visão",
    essence: "mente",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "saída",
    chamberArticle: "a"
  },
  {
    number: 16,
    name: "Guerreiro",
    color: "Amarelo",
    action: "questionar",
    power: "inteligência",
    essence: "destemor",
    essenceArticle: "o",
    powerArticle: "da",
    chamber: "saída",
    chamberArticle: "a"
  },
  {
    number: 17,
    name: "Terra",
    color: "Vermelho",
    action: "evoluir",
    power: "navegação",
    essence: "sincronicidade",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "matriz",
    chamberArticle: "a"
  },
  {
    number: 18,
    name: "Espelho",
    color: "Branco",
    action: "refletir",
    power: "infinito",
    essence: "ordem",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "matriz",
    chamberArticle: "a"
  },
  {
    number: 19,
    name: "Tormenta",
    color: "Azul",
    action: "catalisar",
    power: "autogeração",
    essence: "energia",
    essenceArticle: "a",
    powerArticle: "da",
    chamber: "matriz",
    chamberArticle: "a"
  },
  {
    number: 20,
    name: "Sol",
    color: "Amarelo",
    action: "iluminar",
    power: "fogo universal",
    essence: "vida",
    essenceArticle: "a",
    powerArticle: "do",
    chamber: "matriz",
    chamberArticle: "a"
  }
]
```

## 8. Nome do Kin

Formato recomendado para português brasileiro:

```ts
{Selo} {Tom} {Cor}
```

Exemplos:

```ts
Kin 204: Semente Solar Amarela
Kin 172: Humano Elétrico Amarelo
Kin 34: Mago Galáctico Branco
```

Implementação:

```ts
function kinName(kin: number): string {
  const tone = TONES[((kin - 1) % 13)];
  const seal = SEALS[((kin - 1) % 20)];
  return `${seal.name} ${tone.name} ${seal.color}`;
}
```

## 9. Mantra Kin

### Estrutura base

```txt
{Verbo do tom} com o fim de {ação do selo}
{Gerúndio do tom} {artigo da essência} {essência do selo}
Selo {artigo da câmara} {câmara} {artigo do poder} {poder do selo}
Com o tom {Tom} da/do {essência do tom}
Eu sou guiado pelo poder {artigo do poder do selo guia} {poder do selo guia}
```

### Regra especial do guia duplicado

Se o tom for 1, 6 ou 11:

```txt
Eu sou guiado pelo meu próprio poder duplicado
```

### Diferença de estilo entre sites

Alguns sites usam o “Eu” na primeira linha:

```txt
Eu pulso com o fim de focalizar
```

Outros omitem:

```txt
Pulso com o fim de focalizar
```

Para o Religare, recomendo salvar como configuração:

```ts
mantraStyle = {
  firstLineWithEu: false,
  punctuation: false
}
```

Assim bate melhor com o Sincronário da Paz. Se quiser formato mais “Livro dos Kins”, usar:

```ts
mantraStyle = {
  firstLineWithEu: true,
  punctuation: true
}
```

### Função de mantra

```ts
function buildMantra(kin: number, style = { firstLineWithEu: false }): string[] {
  const tone = TONES[((kin - 1) % 13)];
  const seal = SEALS[((kin - 1) % 20)];
  const oracle = oracleFromKin(kin);
  const guideSeal = SEALS[oracle.guide.sealNumber - 1];

  const firstVerb = style.firstLineWithEu
    ? `Eu ${tone.mantraAction.toLowerCase()}`
    : tone.mantraAction;

  const line1 = `${firstVerb} com o fim de ${seal.action}`;
  const line2 = `${tone.mantraGerund} ${seal.essenceArticle} ${seal.essence}`;
  const line3 = `Selo ${seal.chamberArticle} ${seal.chamber} ${seal.powerArticle} ${seal.power}`;
  const line4 = `Com o tom ${tone.name} ${articleForToneEssence(tone.essence)} ${tone.essence.toLowerCase()}`;

  const line5 = [1, 6, 11].includes(tone.number)
    ? "Eu sou guiado pelo meu próprio poder duplicado"
    : `Eu sou guiado pelo poder ${guideSeal.powerArticle} ${guideSeal.power}`;

  const lines = [line1, line2, line3, line4, line5];

  if (GAP_KINS.includes(kin)) {
    lines.push("Sou um portal de ativação galáctica, entra por mim");
  }

  return lines;
}
```

### Artigo do tom

```ts
function articleForToneEssence(essence: string): "do" | "da" {
  const feminine = [
    "Forma",
    "Radiação",
    "Igualdade",
    "Sintonização",
    "Integridade",
    "Intenção",
    "Manifestação",
    "Liberação",
    "Cooperação",
    "Presença"
  ];

  return feminine.includes(essence) ? "da" : "do";
}
```

## 10. Portais de Ativação Galáctica

Se o Kin estiver nesta lista, adicionar ao final do mantra:

```txt
Sou um portal de ativação galáctica, entra por mim
```

Lista:

```ts
const GAP_KINS = [
  1, 20, 22, 39, 43, 50, 51, 58, 64, 69, 72, 77,
  85, 88, 93, 96, 106, 107, 108, 109, 110, 111,
  112, 113, 114, 115, 146, 147, 148, 149, 150,
  151, 152, 153, 154, 155, 165, 168, 173, 176,
  184, 189, 192, 197, 203, 210, 211, 218, 222,
  239, 241, 260
]
```

## 11. Onda Encantada

Cada Onda Encantada tem 13 Kins.

```ts
waveNumber = Math.floor((kin - 1) / 13) + 1
waveStartKin = (waveNumber - 1) * 13 + 1
waveTonePosition = ((kin - 1) % 13) + 1
waveSeal = sealFromKin(waveStartKin)
```

### Lista das 20 Ondas Encantadas

```ts
const WAVESPELLS = [
  { number: 1, startKin: 1, name: "Onda Encantada do Dragão Vermelho" },
  { number: 2, startKin: 14, name: "Onda Encantada do Mago Branco" },
  { number: 3, startKin: 27, name: "Onda Encantada da Mão Azul" },
  { number: 4, startKin: 40, name: "Onda Encantada do Sol Amarelo" },
  { number: 5, startKin: 53, name: "Onda Encantada do Caminhante do Céu Vermelho" },
  { number: 6, startKin: 66, name: "Onda Encantada do Enlaçador de Mundos Branco" },
  { number: 7, startKin: 79, name: "Onda Encantada da Tormenta Azul" },
  { number: 8, startKin: 92, name: "Onda Encantada do Humano Amarelo" },
  { number: 9, startKin: 105, name: "Onda Encantada da Serpente Vermelha" },
  { number: 10, startKin: 118, name: "Onda Encantada do Espelho Branco" },
  { number: 11, startKin: 131, name: "Onda Encantada do Macaco Azul" },
  { number: 12, startKin: 144, name: "Onda Encantada da Semente Amarela" },
  { number: 13, startKin: 157, name: "Onda Encantada da Terra Vermelha" },
  { number: 14, startKin: 170, name: "Onda Encantada do Cachorro Branco" },
  { number: 15, startKin: 183, name: "Onda Encantada da Noite Azul" },
  { number: 16, startKin: 196, name: "Onda Encantada do Guerreiro Amarelo" },
  { number: 17, startKin: 209, name: "Onda Encantada da Lua Vermelha" },
  { number: 18, startKin: 222, name: "Onda Encantada do Vento Branco" },
  { number: 19, startKin: 235, name: "Onda Encantada da Águia Azul" },
  { number: 20, startKin: 248, name: "Onda Encantada da Estrela Amarela" }
]
```

### Perguntas da Onda Encantada

```ts
const WAVE_TONE_QUESTIONS = [
  { tone: 1, key: "propósito", question: "Qual é o meu propósito?" },
  { tone: 2, key: "desafio", question: "Quais são os obstáculos?" },
  { tone: 3, key: "serviço", question: "Como posso melhor servir?" },
  { tone: 4, key: "forma", question: "Qual é a forma de ação?" },
  { tone: 5, key: "comando", question: "Como posso potencializar-me?" },
  { tone: 6, key: "igualdade", question: "Como posso organizar-me rumo à igualdade?" },
  { tone: 7, key: "sintonização", question: "Como canalizo meu serviço aos outros?" },
  { tone: 8, key: "integridade", question: "Eu vivo aquilo em que acredito?" },
  { tone: 9, key: "intenção", question: "Como atingir o meu propósito?" },
  { tone: 10, key: "manifestação", question: "Como aperfeiçoar o que faço?" },
  { tone: 11, key: "liberação", question: "Como liberar e deixar ir?" },
  { tone: 12, key: "cooperação", question: "Como dedicar-me a tudo o que tem vida?" },
  { tone: 13, key: "voo mágico", question: "Como aumentar minha alegria e meu amor?" }
]
```

## 12. Oráculo do Kin

O oráculo possui:

```ts
Destino
Guia
Análogo
Antípoda
Oculto
```

### Regras

```ts
Destino:
mesmo Kin calculado.

Análogo:
mesmo tom do destino.
selo análogo = wrap20(19 - seloDestino)

Antípoda:
mesmo tom do destino.
selo antípoda = wrap20(seloDestino + 10)

Oculto:
tom oculto = 14 - tomDestino
selo oculto = 21 - seloDestino
kin oculto = 261 - kinDestino

Guia:
mesmo tom do destino.
selo guia = wrap20(seloDestino + offsetPorTom)
```

### Offset do Kin Guia

```ts
const GUIDE_OFFSETS_BY_TONE = {
  1: 0,
  2: 12,
  3: 4,
  4: 16,
  5: 8,
  6: 0,
  7: 12,
  8: 4,
  9: 16,
  10: 8,
  11: 0,
  12: 12,
  13: 4
}
```

### Utilitários

```ts
function wrap20(n: number): number {
  return ((n - 1) % 20 + 20) % 20 + 1;
}

function kinFromSealTone(sealNumber: number, toneNumber: number): number {
  for (let kin = 1; kin <= 260; kin++) {
    const s = ((kin - 1) % 20) + 1;
    const t = ((kin - 1) % 13) + 1;

    if (s === sealNumber && t === toneNumber) {
      return kin;
    }
  }

  throw new Error("Combinação inválida de selo e tom");
}

function signatureFromSealTone(sealNumber: number, toneNumber: number) {
  const kin = kinFromSealTone(sealNumber, toneNumber);
  const seal = SEALS[sealNumber - 1];
  const tone = TONES[toneNumber - 1];

  return {
    kin,
    sealNumber,
    toneNumber,
    name: `${seal.name} ${tone.name} ${seal.color}`,
    seal,
    tone
  };
}
```

### Função do oráculo

```ts
function oracleFromKin(kin: number) {
  const toneNumber = ((kin - 1) % 13) + 1;
  const sealNumber = ((kin - 1) % 20) + 1;

  const guideOffset = GUIDE_OFFSETS_BY_TONE[toneNumber];

  const destinySeal = sealNumber;
  const destinyTone = toneNumber;

  const analogSeal = wrap20(19 - sealNumber);
  const analogTone = toneNumber;

  const antipodeSeal = wrap20(sealNumber + 10);
  const antipodeTone = toneNumber;

  const occultSeal = 21 - sealNumber;
  const occultTone = 14 - toneNumber;

  const guideSeal = wrap20(sealNumber + guideOffset);
  const guideTone = toneNumber;

  return {
    destiny: signatureFromSealTone(destinySeal, destinyTone),
    guide: signatureFromSealTone(guideSeal, guideTone),
    analog: signatureFromSealTone(analogSeal, analogTone),
    antipode: signatureFromSealTone(antipodeSeal, antipodeTone),
    occult: signatureFromSealTone(occultSeal, occultTone)
  };
}
```

## 13. Exemplo completo: 01/07/2026

```ts
date = "2026-07-01"
timezone = "America/Sao_Paulo"

kin = 204
name = "Semente Solar Amarela"

tone = {
  number: 9,
  name: "Solar",
  essence: "Intenção"
}

seal = {
  number: 4,
  name: "Semente",
  color: "Amarelo",
  action: "focalizar",
  power: "florescimento",
  essence: "percepção"
}
```

Mantra:

```txt
Pulso com o fim de focalizar
Realizando a percepção
Selo a entrada do florescimento
Com o tom Solar da intenção
Eu sou guiado pelo poder do fogo universal
```

Onda:

```ts
waveNumber = 16
waveStartKin = 196
waveName = "Onda Encantada do Guerreiro Amarelo"
waveTonePosition = 9
waveQuestion = "Como atingir o meu propósito?"
```

Oráculo:

```ts
Destino:
Kin 204, Semente Solar Amarela

Guia:
Kin 100, Sol Solar Amarelo

Análogo:
Kin 35, Águia Solar Azul

Antípoda:
Kin 74, Mago Solar Branco

Oculto:
Kin 57, Terra Harmônica Vermelha
```

## 14. Exemplo completo: 11/12/1987

```ts
date = "1987-12-11"
timezone = "America/Sao_Paulo"

kin = 172
name = "Humano Elétrico Amarelo"
```

Mantra:

```txt
Ativo com o fim de influenciar
Vinculando a sabedoria
Selo o processo do livre-arbítrio
Com o tom Elétrico do serviço
Eu sou guiado pelo poder da inteligência
```

Onda:

```ts
waveNumber = 14
waveStartKin = 170
waveName = "Onda Encantada do Cachorro Branco"
waveTonePosition = 3
waveQuestion = "Como posso melhor servir?"
```

Oráculo:

```ts
Destino:
Kin 172, Humano Elétrico Amarelo

Guia:
Kin 16, Guerreiro Elétrico Amarelo

Análogo:
Kin 107, Mão Elétrica Azul

Antípoda:
Kin 42, Vento Elétrico Branco

Oculto:
Kin 89, Lua Espectral Vermelha
```

## 15. Checklist anti bug

1. Não usar bibliotecas genéricas de calendário maia tradicional.
2. Usar o padrão Dreamspell.
3. Fixar 26/07/1987 como Kin 34.
4. Excluir 29/02 da contagem.
5. Resolver timezone antes de transformar timestamp em data.
6. Calcular tom com módulo 13.
7. Calcular selo com módulo 20.
8. Calcular onda com blocos de 13 kins.
9. Calcular oráculo por selo e tom, não por soma simples de Kin, exceto oculto.
10. Renderizar o mantra por fragmentos, não por textos hardcoded.

```

Uma observação estratégica: eu não colocaria interpretações profundas direto no motor de cálculo. Melhor separar em duas camadas: **cálculo sincrônico determinístico** e **interpretação Religare**. Assim você evita que um bug textual ou simbólico contamine a base matemática do Kin.
```

[1]: https://lawoftime.org/timeshipearth/articlesbyvv/longcountdreamspell.html "Long Count and Dreamspell"
[2]: https://sincronariodapaz.org/calcula-kin/ "Calcule seu Kin – Sincronario da Paz"
[3]: https://tzolkin.io/info/selos "Os 20 Selos Solares « As vinte tribos da Nação do Arco-íris"
[4]: https://tzolkin.io/info/encantamento-do-sonho/onda-encantada "A Onda Encantada « Uma cosmologia de criação em 13 etapas"
[5]: https://tzolkin.io/info/encantamento-do-sonho/oraculo "Oráculo do Destino « A Quinta Força aplicada ao Kin"
