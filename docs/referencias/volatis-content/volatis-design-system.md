# Template de Carrossel — Especificação Visual Completa

Template único: **Alternado Claro/Escuro**. Todos os slides são **1080×1350px nativos**.

**REGRA CRÍTICA DE FONTES:** Nunca usar `<link>` do Google Fonts. Sempre embutir as fontes como base64 via `@font-face` no `<style>` do HTML. Usar os pacotes npm `@fontsource/[fonte]` para obter os .woff2 e converter com `base64 -w0`. Isso garante que o export PNG renderize idêntico ao preview no browser.

---

## VARIÁVEIS GLOBAIS (derivadas do onboarding)

```css
:root {
  --P:   [BRAND_PRIMARY];
  --PL:  [BRAND_LIGHT];
  --PD:  [BRAND_DARK];
  --LB:  [LIGHT_BG];
  --LR:  [LIGHT_BORDER];
  --DB:  [DARK_BG];
  --G:   linear-gradient(165deg, [PD] 0%, [P] 50%, [PL] 100%);
  --F-HEAD: '[FONTE_HEADLINE]', sans-serif;   /* Barlow Condensed / Bebas Neue / etc */
  --F-BODY: 'Plus Jakarta Sans', sans-serif;
}
```

---

## ELEMENTOS FIXOS (presentes em TODOS os slides)

### Accent Bar (topo)
```css
.accent-bar {
  position: absolute; top: 0; left: 0; right: 0;
  height: 7px; z-index: 30;
  background: var(--G);
}
/* Em slides gradient: */
.accent-bar.on-grad { background: rgba(255,255,255,0.18); }
```

### Brand Bar
```css
.brand-bar {
  position: absolute; top: 7px; left: 0; right: 0;
  padding: 32px 56px 0;
  display: flex; justify-content: space-between; align-items: center;
  z-index: 20;
  font-family: var(--F-BODY);
  font-size: 17px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
}
.brand-bar.on-light { color: rgba(15,13,12,0.45); font-size: 14px; }
.brand-bar.on-dark  { color: rgba(255,255,255,0.45); font-size: 14px; }
.brand-bar.on-grad  { color: rgba(255,255,255,0.50); font-size: 14px; }
```

### Progress Bar
```css
.prog {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 0 56px 30px; z-index: 20;
  display: flex; align-items: center; gap: 16px;
  font-family: var(--F-BODY);
}
.prog-track {
  flex: 1; height: 3px; border-radius: 2px; overflow: hidden;
}
.prog-fill { height: 100%; border-radius: 2px; }
.prog-num  { font-size: 15px; font-weight: 600; }

.on-light .prog-track { background: rgba(0,0,0,0.08); }
.on-light .prog-fill  { background: var(--P); }
.on-light .prog-num   { color: rgba(0,0,0,0.22); }

.on-dark  .prog-track { background: rgba(255,255,255,0.10); }
.on-dark  .prog-fill  { background: #fff; }
.on-dark  .prog-num   { color: rgba(255,255,255,0.22); }

.on-grad  .prog-track { background: rgba(255,255,255,0.15); }
.on-grad  .prog-fill  { background: rgba(255,255,255,0.6); }
.on-grad  .prog-num   { color: rgba(255,255,255,0.30); }
```


### Tag / Label
```css
.tag {
  font-family: var(--F-BODY);
  font-size: 13px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  margin-bottom: 24px;
}
.on-light .tag { color: var(--P); }
.on-dark  .tag { color: var(--PL); }
.on-grad  .tag { color: rgba(255,255,255,0.55); }
```

### Área de Conteúdo (padrão)
```css
.content {
  position: absolute;
  top: 110px; left: 56px; right: 56px; bottom: 80px;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding-bottom: 40px;
}
```
**REGRA:** Conteúdo alinhado pela base do slide (flex-end), nunca centralizado. Isso garante que o texto preencha o espaço de baixo pra cima, evitando blocos pequenos flutuando no meio.

---

## SLIDE DE CAPA (Slide 1)

```css
.slide-capa { background: #000; }

.capa-bg {
  position: absolute; inset: 0;
  background: url('[BASE64_IMAGEM_CAPA]') center/cover no-repeat;
}

.capa-grad {
  position: absolute; inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.35) 0%,
    rgba(0,0,0,0.08) 25%,
    rgba(0,0,0,0.15) 40%,
    rgba(0,0,0,0.65) 55%,
    rgba(0,0,0,0.92) 75%,
    rgba(0,0,0,0.99) 100%
  );
}
/* REGRA: gradiente da capa deve ser forte o suficiente pra garantir contraste 4.5:1 com texto branco na metade inferior */

/* Badge do handle — ALINHADO À ESQUERDA, dentro do bloco de capa */
.capa-badge {
  display: flex; align-items: center; gap: 14px;
  background: rgba(0,0,0,0.38);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 60px;
  padding: 12px 26px 12px 14px;
  backdrop-filter: blur(10px);
  width: fit-content;
  margin-bottom: 32px;
}

/* Badge de tipo + data — NÃO usar na capa (capa é limpa). Usar apenas em slides internos se necessário. */
.capa-type-badge {
  display: none; /* Removido da capa por decisão de design */
}
.capa-type-label {
  background: var(--P);
  color: #fff;
  padding: 8px 20px;
  font-family: var(--F-BODY);
  font-size: 13px; font-weight: 800;
  letter-spacing: 3px; text-transform: uppercase;
  border-radius: 4px;
}
.capa-date {
  font-family: var(--F-BODY);
  font-size: 14px; font-weight: 500;
  color: rgba(255,255,255,0.45);
}
.badge-dot {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--G);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--F-BODY); font-size: 16px; font-weight: 900; color: #fff;
}
.badge-handle {
  font-family: var(--F-BODY);
  font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 0.3px;
}
.badge-check {
  width: 22px; height: 22px; background: var(--P);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}

/* Headline da capa — badge + headline ficam num bloco único */
.capa-headline-area {
  position: absolute;
  bottom: 120px; left: 0; right: 0;
  padding: 0 52px;
  z-index: 10;
}
.capa-headline {
  font-family: var(--F-HEAD);
  font-size: 108px; font-weight: 900;
  line-height: 0.93; letter-spacing: -3px; text-transform: uppercase;
  color: #fff;
}
.capa-headline em {
  color: var(--P); font-style: normal;
}

/* REGRA: headline da capa = versão CURTA (6-8 palavras) da headline completa */
/* REGRA: se headline tiver mais de 4 linhas, reduzir para 88px */
/* REGRA: font-size MÍNIMO 88px — nunca abaixo disso */
/* REGRA: badge fica ACIMA da headline, dentro do .capa-headline-area */
```

---

## SLIDE INTERNO — DARK (Slides 2, 4, 6)

```css
.slide-dark { background: var(--DB); }

.slide-dark .content { justify-content: flex-end; padding-bottom: 40px; }

/* Headline principal */
.dark-h1 {
  font-family: var(--F-HEAD);
  font-size: 80px; font-weight: 900;
  line-height: 0.97; letter-spacing: -2px; text-transform: uppercase;
  color: #fff; margin-bottom: 36px;
}
.dark-h1 em { color: var(--P); font-style: normal; }

/* Número grande decorativo (background) */
.dark-bg-num {
  position: absolute; right: -10px; bottom: 50px;
  font-family: var(--F-HEAD);
  font-size: 380px; font-weight: 900;
  color: rgba(255,255,255,0.04);
  line-height: 1; letter-spacing: -14px;
  pointer-events: none; z-index: 1;
}

/* Body text */
.dark-body {
  font-family: var(--F-BODY);
  font-size: 38px; font-weight: 400;
  line-height: 1.5; letter-spacing: -0.2px;
  color: rgba(255,255,255,0.55);
}
.dark-body strong { color: #fff; font-weight: 700; }
.dark-body em     { color: var(--PL); font-style: normal; }

/* Arrow items */
.dark-arrow-row {
  display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px;
}
.dark-arrow-row::before {
  content: '→'; font-size: 32px; color: rgba(255,255,255,0.3);
  flex-shrink: 0; margin-top: 4px;
  font-family: var(--F-BODY);
}

/* Highlight card */
.dark-card {
  background: rgba(255,255,255,0.04);
  border-left: 6px solid var(--P);
  border-radius: 16px; padding: 44px 48px;
}

/* Big number stat */
.dark-big-stat {
  font-family: var(--F-HEAD);
  font-size: 200px; font-weight: 900;
  line-height: 1; letter-spacing: -8px;
  color: var(--P); margin-bottom: -10px;
}
.dark-stat-label {
  font-family: var(--F-BODY);
  font-size: 30px; font-weight: 500;
  color: rgba(255,255,255,0.35); margin-bottom: 48px;
}
```

---

## SLIDE INTERNO — LIGHT (Slides 3, 5, 7)

```css
.slide-light { background: var(--LB); }

.slide-light .content { justify-content: flex-end; padding-bottom: 40px; }

/* Headline */
.light-h1 {
  font-family: var(--F-HEAD);
  font-size: 72px; font-weight: 900;
  line-height: 1.0; letter-spacing: -1.5px; text-transform: uppercase;
  color: var(--DB); margin-bottom: 32px;
}
.light-h1 em { color: var(--P); font-style: normal; }

/* Body text */
.light-body {
  font-family: var(--F-BODY);
  font-size: 38px; font-weight: 400;
  line-height: 1.55; letter-spacing: -0.2px;
  color: rgba(15,13,12,0.60);
}
.light-body strong { color: var(--DB); font-weight: 800; }

/* Card branco */
.light-card {
  background: #fff;
  border-left: 7px solid var(--P);
  border-radius: 18px; padding: 52px 56px;
}

/* Pattern card (para padrões/listas) */
.light-pcard {
  background: #fff;
  border-radius: 18px; padding: 40px 48px;
  border: 1.5px solid var(--LR);
  margin-bottom: 20px;
}
.light-pnum {
  font-size: 11px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--P); margin-bottom: 14px;
}
.light-ptitle {
  font-family: var(--F-BODY);
  font-size: 30px; font-weight: 800;
  color: var(--DB); margin-bottom: 16px; letter-spacing: -0.3px;
}
.light-pex {
  font-family: var(--F-BODY);
  font-size: 24px; font-weight: 400; line-height: 1.45;
  color: rgba(15,13,12,0.50); font-style: italic;
  border-left: 4px solid var(--P); padding-left: 22px;
}

/* Data table */
.light-table { width: 100%; border-collapse: collapse; }
.light-table th {
  background: var(--P); color: #fff;
  padding: 20px 24px; font-size: 16px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase; text-align: left;
  font-family: var(--F-BODY);
}
.light-table td {
  padding: 22px 24px; font-size: 26px; font-weight: 500;
  border-bottom: 1px solid var(--LR);
  font-family: var(--F-BODY);
}
.light-table tr:last-child td { border-bottom: none; }
```

---

## SLIDE INTERNO — GRADIENT (Slide 8)

```css
.slide-grad { background: var(--G); }

.slide-grad .content { justify-content: flex-end; padding-bottom: 40px; }

/* Número decorativo de fundo */
.grad-bg-num {
  position: absolute; right: -15px; bottom: 40px;
  font-family: var(--F-HEAD);
  font-size: 420px; font-weight: 900;
  color: rgba(255,255,255,0.06);
  line-height: 1; letter-spacing: -16px;
  pointer-events: none;
}

/* Headline */
.grad-h1 {
  font-family: var(--F-HEAD);
  font-size: 80px; font-weight: 900;
  line-height: 0.97; letter-spacing: -2px; text-transform: uppercase;
  color: #fff; margin-bottom: 40px;
}

/* Body */
.grad-body {
  font-family: var(--F-BODY);
  font-size: 38px; font-weight: 400;
  line-height: 1.55; letter-spacing: -0.2px;
  color: rgba(255,255,255,0.65);
}
.grad-body strong { color: #fff; font-weight: 700; }

/* Arrow rows */
.grad-row {
  display: flex; align-items: flex-start; gap: 22px; margin-bottom: 30px;
}
.grad-arrow {
  font-size: 34px; color: rgba(255,255,255,0.4);
  flex-shrink: 0; margin-top: 4px;
  font-family: var(--F-BODY);
}
.grad-text {
  font-family: var(--F-BODY);
  font-size: 32px; font-weight: 500;
  line-height: 1.45; letter-spacing: -0.2px;
  color: rgba(255,255,255,0.72);
}
.grad-text strong { color: #fff; font-weight: 800; }
```

---

## SLIDE DARK COM IMAGEM INTERNA (Slides 4, 6 quando há imagens extras)

Quando o usuário envia mais de 1 imagem, os slides 4 e 6 (dark) recebem imagem de fundo com overlay pesado.

```css
/* Imagem de fundo em slide interno */
.slide-img-bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
  z-index: 0;
}

/* Overlay pesado — 75-85% opacity para garantir legibilidade */
.slide-img-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(4,4,22,0.80) 0%,
    rgba(4,4,22,0.70) 30%,
    rgba(4,4,22,0.75) 60%,
    rgba(4,4,22,0.90) 100%
  );
  z-index: 1;
}

/* Conteúdo sobre a imagem — z-index acima do overlay */
.slide-dark.with-img .content { z-index: 2; }
```

**Exemplo de HTML para slide dark com imagem interna:**
```html
<div class="slide slide-dark on-dark with-img" id="slide-4">
  <div class="slide-img-bg" style="background-image: url('data:image/jpeg;base64,[BASE64_IMAGEM]');"></div>
  <div class="slide-img-overlay"></div>
  <div class="accent-bar"></div>
  <div class="brand-bar on-dark">...</div>
  <div class="content">
    <div class="tag">[TAG]</div>
    <div class="dark-body">[TEXTO]</div>
  </div>
  <div class="prog">...</div>
</div>
```

**REGRA:** O overlay NUNCA pode ser menor que 70% opacity. Legibilidade do texto sempre prevalece sobre a imagem.
**REGRA:** TODAS as imagens enviadas pelo usuário devem ser usadas.

---

## IMAGE BOX (para slides com espaço sobrando)

Quando um slide tem menos de 60% de preenchimento de texto, sugerir ao usuário um box de imagem no topo. Componente disponível tanto em slides light quanto dark.

```css
/* Box retangular de imagem — posicionado no topo da área de conteúdo */
.img-box {
  width: 100%;
  height: 360px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 36px;
}
.img-box img {
  width: 100%; height: 100%;
  object-fit: cover;
}

/* Variante dark — borda sutil */
.on-dark .img-box {
  border: 1.5px solid rgba(255,255,255,0.08);
}

/* Variante light — sombra sutil */
.on-light .img-box {
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
}
```

**Exemplo de HTML para slide light com img-box:**
```html
<div class="slide slide-light on-light" id="slide-5">
  <div class="accent-bar"></div>
  <div class="brand-bar on-light">...</div>
  <div class="content">
    <div class="img-box">
      <img src="data:image/jpeg;base64,[BASE64]" alt="">
    </div>
    <div class="tag">[TAG]</div>
    <div class="light-body">[TEXTO]</div>
  </div>
  <div class="prog">...</div>
</div>
```

**REGRA:** O img-box é SUGERIDO, nunca imposto. O agente indica os slides candidatos e o usuário decide.
**REGRA:** Se o conteúdo do slide já preenche 60%+ da área, NÃO sugerir img-box.

---

## SLIDE CTA (Slide final — sempre último)

O CTA usa layout assimétrico com texto alinhado à esquerda. Não é centralizado.

```css
.slide-cta { background: var(--LB); }

.slide-cta .content {
  justify-content: flex-end;
  padding-bottom: 40px;
}

/* Frase-ponte — conecta o conteúdo do carrossel ao CTA */
.cta-bridge {
  font-family: var(--F-BODY);
  font-size: 38px; font-weight: 500;
  line-height: 1.5; letter-spacing: -0.2px;
  color: rgba(15,13,12,0.55);
  margin-bottom: 48px;
}
.cta-bridge strong { color: var(--DB); font-weight: 800; }

/* Headline do CTA */
.cta-headline {
  font-family: var(--F-HEAD);
  font-size: 72px; font-weight: 900;
  line-height: 0.97; letter-spacing: -2px; text-transform: uppercase;
  color: var(--DB); margin-bottom: 40px;
}
.cta-headline em { color: var(--P); font-style: normal; }

/* Keyword box — com a palavra-chave do CTA */
.cta-kbox {
  background: #fff;
  border: 3px solid rgba(247,54,0,0.15);
  border-radius: 20px; padding: 40px 48px;
  margin-bottom: 32px;
}
.cta-kinstr {
  font-family: var(--F-BODY);
  font-size: 20px; font-weight: 500;
  color: rgba(15,13,12,0.42); margin-bottom: 12px;
}
.cta-kword {
  font-family: var(--F-HEAD);
  font-size: 80px; font-weight: 900;
  color: var(--P); letter-spacing: -2px; line-height: 1; margin-bottom: 14px;
}
.cta-kbenefit {
  font-family: var(--F-BODY);
  font-size: 22px; font-weight: 500; line-height: 1.5;
  color: rgba(15,13,12,0.50);
}

/* Footer do CTA */
.cta-footer {
  display: flex; align-items: center; gap: 16px;
}
.cta-footer-dot {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--G);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--F-BODY); font-size: 16px; font-weight: 900; color: #fff;
}
.cta-footer-text {
  font-family: var(--F-BODY);
  font-size: 18px; color: rgba(15,13,12,0.35);
}

/* Sem swipe arrow no CTA. Progress bar em 100%. */
```

**Exemplo de HTML para slide CTA:**
```html
<div class="slide slide-cta on-light" id="slide-9">
  <div class="accent-bar"></div>
  <div class="brand-bar on-light">...</div>
  <div class="content">
    <div class="cta-bridge">[Frase-ponte que conecta o conteúdo ao CTA — ex: "Os dados mostram que distribuição vem antes de qualidade. Quem ignora isso produz pra <strong>própria bolha</strong>."]</div>
    <div class="cta-headline">QUER O<br><em>MANUAL</em><br>COMPLETO?</div>
    <div class="cta-kbox">
      <div class="cta-kinstr">Comenta a palavra abaixo:</div>
      <div class="cta-kword">MANUAL</div>
      <div class="cta-kbenefit">e recebe o guia direto na DM</div>
    </div>
    <div class="cta-footer">
      <div class="cta-footer-dot">B</div>
      <span class="cta-footer-text">@brandsdecoded · Envio automático via DM</span>
    </div>
  </div>
  <div class="prog">...</div>
</div>
```

**REGRA CTA:** A frase-ponte é OBRIGATÓRIA. Conecta o último insight do carrossel ao CTA. Nunca um CTA genérico desconectado do conteúdo.
**REGRA CTA:** Layout alinhado à esquerda, nunca centralizado (exceto o conteúdo dentro do .cta-kbox que pode ser centralizado).

---

## SEQUÊNCIA — ALTERNADO CLARO/ESCURO

```
Slide 1:  Capa (foto full-bleed + headline)
Slide 2:  Dark (hook)
Slide 3:  Light (contexto / mecanismo pt.1)
Slide 4:  Dark (mecanismo pt.2)
Slide 5:  Light (prova / dados)
Slide 6:  Dark (expansão)
Slide 7:  Light (aplicação)
Slide 8:  Grad (direção)
Slide 9:  Light CTA
```

---

## GARANTIAS DE LEGIBILIDADE

Verificar antes de renderizar qualquer slide:

1. **Contraste texto/fundo:** mínimo 4.5:1 — se imagem de fundo clara, escurecer gradiente
2. **Headline na capa:** nunca ultrapassa 4 linhas; se sim, reduzir font-size em 12px e testar
3. **Body text:** nunca sobrepõe progress bar — padding-bottom mínimo 80px em todos os slides
4. **Palavras em cor accent:** apenas palavras-chave, nunca linhas inteiras
5. **Brand bar:** sempre legível — nunca deixar cor do brand bar igual à cor de fundo
6. **Safe area horizontal:** mínimo 56px de cada lado para todo texto
7. **Sem swipe arrow** — o swipe é nativo do Instagram, nenhum elemento visual de seta nos slides

---

## PREVIEW LADO A LADO (no HTML)

O HTML gerado deve incluir um modo de preview onde todos os slides aparecem lado a lado em miniatura (30% do tamanho original). Isso permite ao usuário ver o carrossel inteiro de uma vez e avaliar o ritmo visual.

```css
/* Preview mode — slides em 30% lado a lado */
.slides-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: center;
  max-width: 1400px;
  margin: 0 auto;
}

.slide.preview-mode {
  transform: scale(0.30);
  transform-origin: top left;
  margin-bottom: -945px;  /* compensa a altura reduzida */
  margin-right: -756px;   /* compensa a largura reduzida */
}
```

**Regra:** O HTML deve ter DOIS modos de visualização:
1. **Preview** (padrão ao abrir) — slides lado a lado em miniatura pra visão geral
2. **Full size** — slides empilhados verticalmente em 1080×1350 pra revisão detalhada

Incluir um botão toggle no topo do HTML:
```html
<button onclick="toggleView()" style="...">Alternar Preview / Tamanho Real</button>
```

---

## INSTAGRAM FRAME PREVIEW (opcional — se o modelo tiver capacidade)

Antes dos slides em tamanho real, renderizar um mockup de como o carrossel aparecerá no feed do Instagram:

```css
.ig-frame {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.1);
  overflow: hidden;
  margin: 0 auto 40px;
}

/* Header do Instagram */
.ig-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
}
.ig-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--G);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 900; color: #fff;
}
.ig-handle {
  font-size: 14px; font-weight: 600; color: #262626;
}
.ig-handle-sub {
  font-size: 12px; color: #8e8e8e;
}

/* Viewport 4:5 */
.ig-viewport {
  width: 420px; height: 525px;
  overflow: hidden; position: relative;
}

/* Dots */
.ig-dots {
  display: flex; justify-content: center; gap: 4px;
  padding: 12px 0;
}
.ig-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #c4c4c4;
}
.ig-dot.active { background: #0095f6; }

/* Actions */
.ig-actions {
  display: flex; gap: 16px; padding: 8px 16px;
}

/* Caption */
.ig-caption {
  padding: 4px 16px 16px;
  font-size: 13px; color: #262626; line-height: 1.4;
}
```

**Exemplo de HTML do Instagram Frame:**
```html
<div class="ig-frame">
  <div class="ig-header">
    <div class="ig-avatar">[INICIAL]</div>
    <div>
      <div class="ig-handle">@[handle]</div>
      <div class="ig-handle-sub">[Nicho]</div>
    </div>
  </div>
  <div class="ig-viewport">
    <!-- Slide 1 em escala 420/1080 = 0.389 -->
  </div>
  <div class="ig-dots">
    <div class="ig-dot active"></div>
    <!-- mais dots conforme nº de slides -->
  </div>
  <div class="ig-actions">❤️ 💬 ✈️ 🔖</div>
  <div class="ig-caption"><strong>@[handle]</strong> [primeira frase da legenda]...</div>
</div>
```

**REGRA:** O Instagram Frame é um PREVIEW — não é exportado como PNG. Serve apenas pra o usuário visualizar como vai ficar no feed. Os PNGs exportados são os slides 1080×1350 puros.

---

## BADGE DE TIPO NA CAPA

Todo carrossel inclui um badge no canto superior esquerdo da capa indicando o tipo e a data:

```html
<div class="capa-type-badge">
  <span class="capa-type-label">[TENDÊNCIA | ANÁLISE | CASE | PREVISÃO]</span>
  <span class="capa-date">[DD/MM/AAAA]</span>
</div>
```

O tipo é derivado da escolha no Briefing Criativo:
- Tendência Interpretada → `TENDÊNCIA`
- Tese Contraintuitiva → `ANÁLISE`
- Case/Benchmark → `CASE`
- Previsão/Futuro → `PREVISÃO`
