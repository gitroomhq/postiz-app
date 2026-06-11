# Vocaccio Design System

## 1. Propósito deste documento

Este arquivo orienta agentes, IDEs e sistemas de desenvolvimento na criação de sites, landing pages, apps, dashboards, apresentações, boards e peças digitais da Vocaccio.

A intenção não é engessar a criação, mas garantir coerência visual, verbal e estratégica em qualquer entrega. Priorize boas práticas atuais de UI, UX, performance, acessibilidade e desenvolvimento. Use este documento como camada de identidade, não como substituto das melhores práticas técnicas.

## 2. Essência da marca

A Vocaccio é um estúdio de marketing consciente, criativo e assistido por IA. A marca une estratégia, estética, inteligência artificial, conteúdo, automação e sensibilidade humana para transformar complexidade em presença.

### Ideia central

Marketing tão leve que parece mágica.

### Território

Magia com método.

### Arquétipos

| Arquétipo | Como aparece |
|---|---|
| Mago | Transformação, encantamento, alquimia, atmosfera e surpresa |
| Sábio | Clareza, método, estratégia, autoridade e discernimento |
| Criador | Estética, originalidade, expressão, disrupção e linguagem autoral |

### Sensação desejada

A marca deve parecer inteligente, estética, leve, mágica, artística, estratégica e memorável. Pode flertar com o estranho, o surreal e o inesperado, desde que preserve sofisticação, clareza e intenção.

## 3. Princípios de identidade

1. Magia com método: toda atmosfera mágica deve estar sustentada por clareza, estrutura e estratégia.
2. Estranhamento com propósito: elementos surreais ou bizarros devem tornar a mensagem mais memorável, não apenas decorativa.
3. Leveza com autoridade: evitar excesso de informações, mas manter densidade conceitual.
4. Brasilidade sentida, não explicada: referências brasileiras devem aparecer de forma intrínseca, urbana, cultural, orgânica e indireta.
5. Digital sem frieza: tecnologia, IA e automação devem parecer humanas, fluidas e intuitivas.
6. Beleza funcional: estética sempre a serviço da compreensão, retenção e conversão.
7. Coerência flexível: manter a alma da marca sem tornar todos os layouts iguais.

## 4. Paleta de cores

Use a paleta como base, mas permita variações tonais quando necessário para contraste, acessibilidade e contexto.

### Cores principais

| Token | Nome | Hex | Uso recomendado |
|---|---|---:|---|
| `--color-coral` | Névoa Coral | `#E09E91` | Calor humano, ação, emoção, destaques e luzes |
| `--color-rose` | Rosa Oracular | `#CB95A8` | Criatividade, intuição, magnetismo e detalhes |
| `--color-violet` | Violeta Vocaccio | `#8D67A7` | Magia, transformação, profundidade e gradientes |
| `--color-blue` | Azul Portal | `#5180B8` | Tecnologia, IA, clareza, dados e interfaces |
| `--color-indigo` | Índigo Método | `#6562A7` | Estratégia, autoridade, estrutura e confiança |
| `--color-lavender` | Lavanda Nebulosa | `#DAC7D6` | Fundos suaves, respiros, cards e estados leves |
| `--color-graphite` | Grafite Cósmico | `#201A2E` | Fundos escuros, texto de alto contraste e sofisticação |
| `--color-white` | Branco Ritual | `#FFFFFF` | Logo, headlines, texto principal e respiro |

### Cores auxiliares recomendadas

| Token | Nome | Hex | Uso recomendado |
|---|---|---:|---|
| `--color-ink` | Quase Preto | `#0F0F14` | Background premium e áreas de alto contraste |
| `--color-cream` | Off-white Editorial | `#F5F0EA` | Headlines, cartões claros e textura vintage |
| `--color-orange` | Coral Fogo | `#FF6B3D` | Pontos de ação, palavras-chave e detalhes fortes |
| `--color-pink-light` | Rosa Néon Suave | `#E88AC8` | Luz, glow, estados ativos e acentos |
| `--color-electric-blue` | Azul Elétrico | `#3A86FF` | Tecnologia, interações e gráficos |

### Gradientes

Prefira gradientes atmosféricos e suaves, não blocos artificiais muito saturados.

```css
:root {
  --gradient-vocaccio: linear-gradient(135deg, #E09E91 0%, #CB95A8 32%, #8D67A7 62%, #5180B8 100%);
  --gradient-vocaccio-deep: radial-gradient(circle at 20% 20%, rgba(224,158,145,.85), transparent 32%),
                             radial-gradient(circle at 70% 35%, rgba(141,103,167,.75), transparent 36%),
                             radial-gradient(circle at 80% 80%, rgba(81,128,184,.7), transparent 34%),
                             #0F0F14;
  --gradient-glow: linear-gradient(90deg, #E09E91, #CB95A8, #8D67A7, #5180B8);
}
```

### Regras de uso

- Em interfaces, priorize fundos escuros sofisticados com alto contraste.
- Use branco ou off-white como cor predominante de texto.
- Aplique as cores da marca também em luz, fotografia, sombras, cards, bordas e efeitos.
- Evite usar todas as cores fortes ao mesmo tempo em elementos concorrentes.
- Teste contraste mínimo para textos, especialmente sobre gradientes e imagens.

## 5. Tipografia

A Vocaccio usa contraste tipográfico como parte central da identidade.

### Direção tipográfica

| Função | Estilo | Sugestões |
|---|---|---|
| Headline de impacto | Condensada pesada, branca, editorial, estilo tabloide | Anton, Archivo Black, Impact, Bebas Neue |
| Serifada editorial | Elegante, poética, sofisticada, levemente ritual | Cormorant Garamond, Instrument Serif, Fraunces |
| Texto de apoio | Sans limpa, moderna, legível e neutra | Manrope, Plus Jakarta Sans, Inter |
| Interface | Sans funcional, acessível, clara e escalável | Inter, Manrope, Plus Jakarta Sans |
| Logo | Usar arquivo oficial da marca | Não recriar com fonte genérica |

### Stack recomendada para web

```css
:root {
  --font-display: "Anton", "Archivo Black", Impact, sans-serif;
  --font-serif: "Cormorant Garamond", "Instrument Serif", "Fraunces", serif;
  --font-sans: "Manrope", "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
}
```

### Hierarquia sugerida

```css
.h-hero {
  font-family: var(--font-display);
  font-size: clamp(4rem, 12vw, 12rem);
  line-height: .85;
  letter-spacing: -0.04em;
  text-transform: uppercase;
}

.h-editorial {
  font-family: var(--font-serif);
  font-size: clamp(2rem, 5vw, 5rem);
  line-height: .95;
  font-weight: 500;
}

.body {
  font-family: var(--font-sans);
  font-size: clamp(1rem, 1.2vw, 1.125rem);
  line-height: 1.65;
}
```

### Boas práticas

- Use headlines grandes com respiro e intenção.
- Prefira texto principal em branco ou off-white.
- Use coral, rosa, violeta e azul como acentos em palavras-chave.
- Não transforme toda a interface em peça tabloide. Reserve o alto impacto para momentos hero, campanhas, capas e posts.
- Garanta legibilidade em mobile, especialmente em títulos condensados.

## 6. Logo e marca

### Aplicações principais

| Versão | Uso |
|---|---|
| Logo branco | Fundos escuros, fotos, gradientes e aplicações premium |
| Logo escuro | Fundos claros, documentos e versões editoriais limpas |
| Logo sobre gradiente | Avatares, capas, posts, cards e peças de marca |
| Símbolo isolado | Favicon, app icon, selo, marca d'água e assinatura |
| Selo circular | Materiais institucionais, apresentações, rodapés e mockups |

### Regras

- Use o logo oficial sempre que possível. Não redesenhe.
- Preserve proporção, respiro e legibilidade.
- Em fundos complexos, aplique overlay escuro, blur ou faixa de contraste.
- Não aplique sombras pesadas, contornos exagerados ou efeitos baratos.
- Em interfaces, o logo pode ser pequeno e discreto. Em peças editoriais, pode ter presença maior.

## 7. Estilo visual

### Território consolidado

Tabloide premium, zen digital e magia estratégica.

### Características visuais

| Camada | Direção |
|---|---|
| Fotografia | Realista, cinematográfica, colorida e com atmosfera |
| Surrealismo | Sutil ou médio, memorável, mas com propósito |
| Textura | Vintage leve, grain, papel, halftone e desgaste discreto |
| Gradiente | Presente em luz, sombra, fundo, roupa, objetos, UI e reflexos |
| Digital | Glass boxes, painéis, halos, sistemas orbitais e dados |
| Brasilidade | Urbana, cultural, orgânica e indireta |
| Composição | Alternar layouts densos com composições limpas |
| Respiro | Essencial para manter sofisticação e leitura |

## 8. Elementos gráficos

### Elementos aprovados

| Elemento | Uso |
|---|---|
| Glass boxes | Cards, painéis, dashboards, indicadores, automações e módulos |
| Halos e portais | Momentos de transformação, foco, meditação e magia |
| Órbitas | Sistemas, estratégia, automação e inteligência ao redor do cliente |
| Grain vintage | Superfícies, fundos, imagens e overlays |
| Halftone discreto | Posts, capas, cartazes e peças de impacto |
| Molduras finas | Cards, seções, quotes, notas e detalhes premium |
| Flores e orgânicos | Criatividade, vida, vocação e contraste com tecnologia |
| Pequenos brilhos | Ênfase, descoberta, magia e detalhes de UI |

### Glass boxes

Use com moderação. Eles devem organizar, não poluir.

```css
.glass-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
  border-radius: 24px;
}
```

### Overlays e textura

```css
.texture-grain::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .12;
  mix-blend-mode: soft-light;
  background-image: url("/textures/grain.png");
}

.image-overlay {
  background:
    linear-gradient(180deg, rgba(15,15,20,.1), rgba(15,15,20,.78)),
    radial-gradient(circle at 20% 20%, rgba(224,158,145,.35), transparent 30%),
    radial-gradient(circle at 80% 60%, rgba(81,128,184,.28), transparent 35%);
}
```

## 9. Iconografia

### Estilo

- Monoline ou interface minimalista.
- Cantos levemente arredondados.
- Peso fino a médio.
- Evitar ícones genéricos demais.
- Usar acentos da paleta com consistência.
- Preferir ícones simples, com respiro e boa leitura em tamanhos pequenos.

### Temas essenciais

| Tema | Ícone |
|---|---|
| Estratégia | Alvo, bússola, mapa, seta |
| IA | Chip, circuito, cérebro abstrato, sparkle digital |
| Conteúdo | Página, balão, cursor, caneta |
| Branding | Selo, prisma, assinatura, impressão |
| Automação | Órbita, fluxo, engrenagem suave |
| Transformação | Portal, halo, chama, borboleta abstrata |
| Performance | Gráfico, barra, seta, pulso |
| Presença | Aura, olho abstrato, avatar, sinal |

## 10. Fotografia e imagens

### Direção

A imagem deve parecer real, mesmo quando traz uma ideia improvável.

| Direção | Aplicação |
|---|---|
| Zen digital | Pessoas meditativas ou centradas com sistemas orbitais |
| Urbano mágico | Cidade, rooftop, fachadas, luzes, concreto e vida |
| Surreal editorial | Objetos impossíveis tratados como reais |
| Tabloide premium | Imagem forte, headline forte, textura e contraste |
| Brasilidade indireta | Densidade urbana, calor, grafismos, plantas, postes, ruas, varandas |
| Tecnologia orgânica | UI, dados e automações integrados ao ambiente |

### Evitar

- Fotos corporativas genéricas.
- Pessoas sempre olhando para notebook ou celular.
- Brasilidade literal, turística ou estereotipada.
- Excesso de hologramas e telas em todas as imagens.
- Estética de IA muito polida, plástica ou sem textura.
- Pessoas sem presença emocional.

## 11. Diretrizes de UI

Estas diretrizes devem apoiar, não substituir, boas práticas do framework, biblioteca ou agente utilizado.

### Layout

- Priorize grids claros, responsivos e com bom espaçamento.
- Use seções com contraste entre impacto e respiro.
- Em páginas longas, alterne áreas escuras, áreas com gradiente e áreas claras editoriais.
- Evite blocos excessivamente simétricos quando a peça pedir mais personalidade.
- Em interfaces funcionais, priorize clareza acima de impacto visual.

### Componentes

#### Cards

- Podem ser glass, sólidos escuros ou claros editoriais.
- Devem ter bom padding, bordas suaves e hierarquia clara.
- Evitar excesso de bordas brilhantes em muitos cards simultâneos.

#### Botões

```css
.button-primary {
  background: linear-gradient(135deg, #E09E91, #CB95A8, #8D67A7);
  color: #FFFFFF;
  border-radius: 999px;
  padding: .875rem 1.25rem;
  font-family: var(--font-sans);
  font-weight: 700;
}

.button-secondary {
  background: rgba(255,255,255,.06);
  color: #FFFFFF;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  padding: .875rem 1.25rem;
}
```

#### Inputs

- Bordas suaves.
- Estados ativos em violeta, rosa ou azul.
- Alto contraste entre texto e fundo.
- Feedback claro de erro, sucesso e carregamento.

#### Navegação

- Simples, limpa e sem excesso de itens.
- Sticky headers podem funcionar bem em sites e apps.
- Logo sempre legível.
- Em fundos escuros, usar blur e glass com cautela.

### Motion

Use movimento com intenção.

| Movimento | Uso |
|---|---|
| Fade e blur | Entrada de cards, modais e seções |
| Float sutil | Elementos orbitais, brilhos e pequenos ícones |
| Parallax leve | Hero, imagens editoriais e fundos |
| Glow controlado | Hover, estados ativos e CTAs |
| Microinterações | Botões, tabs, cards e formulários |

Evite animações longas, excessivas ou que prejudiquem performance.

## 12. Diretrizes de UX

### Prioridades

1. Clareza da proposta.
2. Legibilidade.
3. Velocidade.
4. Navegação simples.
5. Conversão sem pressão.
6. Acessibilidade.
7. Encantamento com propósito.

### Conversão

A Vocaccio não deve parecer agressiva. CTAs devem ser claros, mas leves.

Exemplos:

- Criar com método
- Entrar no fluxo
- Ver possibilidades
- Começar meu projeto
- Transformar minha presença
- Quero clareza criativa
- Vamos dar forma a isso

### Conteúdo

- Comece com uma tensão real ou insight forte.
- Mostre método antes da oferta.
- Evite blocos longos sem respiro.
- Use frases memoráveis como divisores.
- Organize conteúdo em cards, listas, etapas e comparações.

## 13. Aplicações por tipo de produto

### Sites institucionais

- Hero forte com logo, frase de impacto e proposta clara.
- Alternar seções editoriais, cards de método, provas e CTA leve.
- Usar gradiente e fotografia com moderação estratégica.
- Evitar parecer template SaaS genérico.

### Landing pages

- Clareza acima de experimentação.
- Headline forte e benefício tangível.
- Usar estética Vocaccio em detalhes, não comprometer conversão.
- CTAs visíveis, contrastantes e coerentes.
- Provas, exemplos e processo devem ser fáceis de escanear.

### Apps e dashboards

- Priorizar usabilidade, consistência e performance.
- Usar identidade em tokens, estados, ícones, cards e microinterações.
- Evitar excesso de surrealismo em áreas operacionais.
- Glass pode aparecer em painéis especiais, não em todos os componentes.

### Boards e apresentações

- Visual editorial, com boa hierarquia.
- Pouco texto por slide.
- Uso generoso de imagem, gradiente e tipografia.
- Alternar slides de impacto com slides claros e didáticos.

### Posts e campanhas

- Pode usar linguagem mais tabloide, surreal e provocativa.
- Headline grande e memorável.
- Logo presente.
- Tipografia branca ou off-white.
- Textura leve.
- Acentos de cor com moderação.

## 14. Tom de voz

### Personalidade verbal

| Traço | Como escrever |
|---|---|
| Sábio | Clareza, método, visão e discernimento |
| Mágico | Transformação, fluxo, alquimia e surpresa |
| Criativo | Metáforas fortes, imagens mentais e linguagem memorável |
| Leve | Sem pressão, sem drama, sem excesso de jargão |
| Estratégico | Toda frase deve apontar para uma intenção |
| Brasileiro | Naturalidade, ritmo, calor e presença cultural sutil |

### Frases de marca

- Marketing tão leve que parece mágica.
- Magia com método.
- Do invisível ao tangível.
- A calma vira conteúdo.
- Não é feitiçaria. É método.
- Ideias fora do óbvio, organizadas para gerar presença, desejo e resultado.
- Seu conteúdo não precisa ser comportado para ser lembrado.
- Marketing com método, coragem e magnetismo.
- Estratégia, estética e inteligência para dar forma à sua vocação.
- Estratégia, criação e automação orbitando ao seu redor.

### Evitar

- Linguagem agressiva de venda.
- Promessas exageradas.
- Misticismo caricato.
- Frieza corporativa.
- Jargão técnico sem necessidade.
- Textos longos sem hierarquia.

## 15. Acessibilidade e performance

### Acessibilidade

- Garantir contraste adequado.
- Não depender apenas de cor para comunicar estado.
- Usar labels claros em inputs.
- Usar alt text em imagens importantes.
- Manter foco visível em elementos interativos.
- Evitar texto pequeno sobre imagem complexa.
- Testar navegação por teclado em interfaces.

### Performance

- Otimizar imagens.
- Usar formatos modernos quando possível.
- Evitar excesso de blur, vídeos pesados e sombras complexas em mobile.
- Carregar fontes com parcimônia.
- Usar animações leves.
- Priorizar Core Web Vitals quando aplicável.

## 16. Tokens sugeridos

```css
:root {
  color-scheme: dark;

  --color-coral: #E09E91;
  --color-rose: #CB95A8;
  --color-violet: #8D67A7;
  --color-blue: #5180B8;
  --color-indigo: #6562A7;
  --color-lavender: #DAC7D6;
  --color-graphite: #201A2E;
  --color-ink: #0F0F14;
  --color-cream: #F5F0EA;
  --color-white: #FFFFFF;
  --color-orange: #FF6B3D;

  --font-display: "Anton", "Archivo Black", Impact, sans-serif;
  --font-serif: "Cormorant Garamond", "Instrument Serif", "Fraunces", serif;
  --font-sans: "Manrope", "Inter", "Plus Jakarta Sans", system-ui, sans-serif;

  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 40px;
  --radius-pill: 999px;

  --space-1: .25rem;
  --space-2: .5rem;
  --space-3: .75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --space-9: 6rem;

  --shadow-soft: 0 24px 80px rgba(0, 0, 0, .28);
  --shadow-glow: 0 0 48px rgba(141, 103, 167, .35);
  --border-glass: 1px solid rgba(255, 255, 255, .18);

  --gradient-vocaccio: linear-gradient(135deg, #E09E91 0%, #CB95A8 32%, #8D67A7 62%, #5180B8 100%);
  --gradient-glow: linear-gradient(90deg, #E09E91, #CB95A8, #8D67A7, #5180B8);
}
```

## 17. Checklist para agentes e IDEs

Antes de finalizar qualquer criação para a Vocaccio, verifique:

- A peça comunica magia com método?
- O logo está presente quando fizer sentido?
- A tipografia tem contraste entre impacto e elegância?
- A paleta aparece além dos textos, também na atmosfera?
- Há respiro suficiente?
- A interface ou peça está legível em mobile?
- O visual parece autoral, não genérico?
- O surrealismo tem propósito?
- A brasilidade, quando presente, está intrínseca e não literal?
- A conversão está clara, mas não agressiva?
- As boas práticas de UX, acessibilidade e performance foram respeitadas?

## 18. Regra final

Crie com liberdade, mas preserve a alma da marca.

A Vocaccio deve parecer um ponto de encontro entre estratégia, estética, inteligência e encantamento. Uma marca capaz de transformar o invisível em presença, o caos em método e a complexidade em uma experiência tão fluida que parece mágica.
