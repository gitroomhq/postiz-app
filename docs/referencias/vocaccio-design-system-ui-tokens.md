# Vocaccio Design System

Guia portavel para manter a mesma identidade visual da Vocaccio em outros projetos, stacks e IDEs. Use este documento como briefing para humanos, agentes de codigo ou ferramentas de prototipagem.

## Essencia

A Vocaccio deve parecer um atelie de comunicacao sofisticado: humano, preciso, sensivel e tecnologico sem ficar frio. A interface combina papel quente, vidro suave, tipografia editorial e um gradiente aurora com movimento orbital.

Principios:

- **Calma premium:** bastante respiro, superficies translúcidas e sombras longas.
- **Editorial + sistema:** titulos expressivos em serifada, UI funcional em sans.
- **Aurora como assinatura:** pessego, rosa, violeta e azul aparecem em degradês, textos destacados e CTAs.
- **Movimento discreto:** animacoes lentas, fluidas e com curvas suaves.
- **Orbitas como capa:** o hero principal pode ter aneis orbitais em largura total, nunca preso a um card ou container boxed.

## Tokens

Use estes tokens como base em CSS, Tailwind theme, design tokens JSON ou variaveis da IDE.

```css
:root {
  color-scheme: light;

  --paper: #f5f4f0;
  --paper-raised: #faf8f3;
  --ink: #201f1d;
  --ink-soft: #55536b;

  --champagne: #dcd0c3;
  --peach: #e89a7b;
  --rose: #cf6295;
  --violet: #7360aa;
  --blue: #2897bf;

  --aurora: linear-gradient(
    135deg,
    var(--peach),
    var(--rose) 42%,
    var(--violet) 72%,
    var(--blue)
  );

  --line: rgba(115, 96, 170, 0.16);
  --glass: rgba(250, 248, 243, 0.76);
  --glass-strong: rgba(250, 248, 243, 0.92);
  --white-glass: rgba(255, 255, 255, 0.56);

  --shadow-soft: 0 24px 70px rgba(94, 86, 154, 0.16);
  --shadow-deep: 0 24px 70px rgba(66, 92, 172, 0.26);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  --radius-sm: 14px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 30px;
}
```

## Tipografia

Fontes atuais:

- **Display:** `Cormorant Garamond`, pesos 500, 600, 700.
- **UI e corpo:** `Manrope`, pesos 400 a 800.
- **Fallback:** `Georgia, serif` para display e `system-ui, sans-serif` para UI.

Import em HTML:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

Escala recomendada:

```css
body {
  font-family: "Manrope", system-ui, sans-serif;
  color: var(--ink);
}

.display-title {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(3rem, 10vw, 7rem);
  font-weight: 600;
  line-height: 0.94;
  letter-spacing: 0;
}

.section-title {
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(2.1rem, 6vw, 4rem);
  font-weight: 600;
  line-height: 0.98;
  letter-spacing: 0;
}

.eyebrow {
  color: var(--rose);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

## Layout

Use uma pagina com fundo atmosferico e conteudo centralizado, mas deixe o hero orbital atravessar a largura inteira da viewport.

```css
html {
  overflow-x: clip;
  background: var(--paper);
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(circle at 14% 8%, rgba(232, 154, 123, 0.34), transparent 30vw),
    radial-gradient(circle at 92% 2%, rgba(207, 98, 149, 0.26), transparent 28vw),
    linear-gradient(145deg, #f5f4f0 0%, #efe5dc 54%, #e9ded3 100%);
}

.page-shell {
  position: relative;
  min-height: 100vh;
  overflow: clip;
}

.content-shell {
  width: min(1500px, calc(100% - clamp(28px, 6vw, 76px)));
  margin-inline: auto;
}
```

## Hero Orbital Full Width

Este e o padrao mais importante para reutilizar. Ele foi adaptado da capa atual da proposta, mas removendo a sensacao boxed. O hero ocupa `100vw`, ignora o limite do container pai e nao tem bordas arredondadas.

HTML:

```html
<section class="orbit-hero">
  <div class="orbit-hero__glow" aria-hidden="true"></div>

  <div class="orbit-hero__content">
    <img
      class="orbit-hero__logo"
      src="/vocaccio-logo-transcending-marketing-360.png"
      alt="Vocaccio"
      width="360"
      height="71"
    />
    <span class="eyebrow orbit-hero__eyebrow">Transcending Marketing</span>
    <h1>Marketing que atravessa a superficie.</h1>
    <p>Da vocacao a acao, com estrategia, estetica e consciencia.</p>
  </div>
</section>
```

CSS:

```css
.orbit-hero {
  position: relative;
  left: 50%;
  right: 50%;
  width: 100vw;
  min-height: clamp(520px, 82vh, 820px);
  margin-left: -50vw;
  margin-right: -50vw;
  isolation: isolate;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(76px, 10vw, 132px) clamp(20px, 6vw, 72px);
  text-align: center;
  color: white;
  background:
    radial-gradient(circle at 12% 12%, rgba(232, 154, 123, 0.85), transparent 36%),
    radial-gradient(circle at 83% 12%, rgba(207, 98, 149, 0.86), transparent 36%),
    radial-gradient(circle at 18% 86%, rgba(40, 151, 191, 0.78), transparent 34%),
    linear-gradient(135deg, #e79b7b 0%, #cf6295 36%, #7360aa 68%, #2897bf 100%);
  background-size: 130% 130%;
  animation: vocaccio-cover-drift 14s ease-in-out infinite alternate;
}

.orbit-hero::before,
.orbit-hero::after {
  content: "";
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 54%;
  width: max(1120px, 116vw);
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.orbit-hero::before {
  background:
    radial-gradient(circle, transparent 0 39%, rgba(255, 255, 255, 0.11) 39.08% 39.18%, transparent 39.28%),
    radial-gradient(circle, transparent 0 52%, rgba(88, 175, 222, 0.25) 52.08% 52.22%, transparent 52.32%),
    radial-gradient(circle, transparent 0 65%, rgba(255, 255, 255, 0.1) 65.08% 65.18%, transparent 65.28%);
  opacity: 0.78;
  animation: vocaccio-orbit-spin 120s linear infinite;
}

.orbit-hero::after {
  background:
    radial-gradient(circle at 86% 60%, rgba(255, 255, 255, 0.94) 0 0.24%, rgba(88, 175, 222, 0.72) 0.48%, transparent 1.32%),
    radial-gradient(circle at 7% 34%, rgba(255, 255, 255, 0.64) 0 0.18%, rgba(255, 255, 255, 0.24) 0.4%, transparent 1.05%),
    radial-gradient(circle at 64% 26%, rgba(255, 255, 255, 0.82) 0 0.2%, rgba(207, 98, 149, 0.58) 0.44%, transparent 1.14%);
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.42));
  opacity: 0.9;
  animation: vocaccio-orbit-spin 120s linear infinite;
}

.orbit-hero__glow {
  position: absolute;
  z-index: 0;
  inset: auto 8% 12%;
  height: 34%;
  border-radius: 999px;
  background: rgba(245, 244, 240, 0.18);
  filter: blur(38px);
}

.orbit-hero__content {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  width: min(980px, 100%);
}

.orbit-hero__logo {
  width: min(220px, 46vw);
  height: auto;
  max-height: 54px;
  object-fit: contain;
  margin-bottom: clamp(28px, 5vw, 46px);
  filter: drop-shadow(0 18px 32px rgba(32, 31, 29, 0.18));
}

.orbit-hero__eyebrow {
  color: rgba(255, 250, 245, 0.82);
}

.orbit-hero h1 {
  max-width: 980px;
  margin: 16px 0 0;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(3.2rem, 10vw, 7.4rem);
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: 0;
}

.orbit-hero p {
  max-width: 720px;
  margin: 24px 0 0;
  color: rgba(255, 250, 245, 0.88);
  font-size: clamp(1rem, 2vw, 1.3rem);
  font-weight: 700;
  line-height: 1.45;
}

@keyframes vocaccio-cover-drift {
  from {
    background-position: 0% 24%;
  }
  to {
    background-position: 100% 76%;
  }
}

@keyframes vocaccio-orbit-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@media (max-width: 760px) {
  .orbit-hero {
    min-height: 560px;
    padding-block: 84px;
  }

  .orbit-hero::before,
  .orbit-hero::after {
    width: max(820px, 168vw);
    top: 55%;
  }
}
```

Uso em React:

```tsx
export function OrbitHero() {
  return (
    <section className="orbit-hero">
      <div className="orbit-hero__glow" aria-hidden="true" />
      <div className="orbit-hero__content">
        <img
          className="orbit-hero__logo"
          src="/vocaccio-logo-transcending-marketing-360.png"
          alt="Vocaccio"
          width="360"
          height="71"
        />
        <span className="eyebrow orbit-hero__eyebrow">Transcending Marketing</span>
        <h1>Marketing que atravessa a superficie.</h1>
        <p>Da vocacao a acao, com estrategia, estetica e consciencia.</p>
      </div>
    </section>
  );
}
```

## Superficies

Use superficies translucidas para ferramentas, paineis e blocos repetidos. Evite colocar cards dentro de cards.

```css
.glass-panel {
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: var(--radius-lg);
  background: var(--glass);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(24px);
}

.soft-card {
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 0% 0%, rgba(232, 154, 123, 0.12), transparent 42%),
    rgba(255, 255, 255, 0.48);
}
```

## Botoes

CTAs principais usam o gradiente aurora. Acoes secundarias ficam em vidro claro com borda fina.

```css
.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border: 0;
  border-radius: 999px;
  padding: 0 18px;
  background: var(--aurora);
  box-shadow: 0 18px 34px rgba(115, 96, 170, 0.3);
  color: #fffaf5;
  font-weight: 900;
  text-decoration: none;
  transition: transform 220ms var(--ease-spring), box-shadow 220ms var(--ease-out);
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 42px rgba(207, 98, 149, 0.28);
}

.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0 16px;
  background: rgba(250, 248, 243, 0.78);
  color: var(--ink);
  font-weight: 800;
  backdrop-filter: blur(18px);
}
```

## Formularios

Campos devem parecer editoriais, mas continuam densos e funcionais.

```css
label {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--ink-soft);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 13px 14px;
  outline: 0;
  background: var(--white-glass);
  color: var(--ink);
  transition: border-color 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(207, 98, 149, 0.58);
  box-shadow: 0 0 0 4px rgba(207, 98, 149, 0.12);
}
```

## Blocos De Conteudo

Titulos grandes e serifados, eyebrow pequeno em rosa, textos com `ink-soft`.

```css
.content-block {
  padding-block: clamp(48px, 8vw, 96px);
}

.content-block h2 {
  margin: 10px 0 0;
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: clamp(2.4rem, 7vw, 5rem);
  font-weight: 600;
  line-height: 0.96;
  letter-spacing: 0;
}

.content-block p {
  max-width: 760px;
  color: var(--ink-soft);
  font-size: clamp(1rem, 1.35vw, 1.12rem);
  line-height: 1.62;
}
```

## Logo E Assets

Assets atuais no projeto:

- `public/vocaccio-logo-transcending-marketing-360.png`
- `public/vocaccio-logo-transcending-marketing.png`
- `public/vocaccio-logo-gradient.png`
- Favicons e manifests em `public/`

Regras:

- Em fundos aurora, use a versao clara/transcending se ela tiver contraste suficiente.
- Em fundos claros, use a marca em gradiente ou tinta escura.
- Sempre definir `width`, `height`, `decoding="async"` e, no hero, `fetchpriority="high"` ou `fetchPriority="high"` em React.

## Motion

Curvas:

- Entrada e transicao comum: `var(--ease-out)`.
- Hover com leve elasticidade: `var(--ease-spring)`.
- Hero orbital: animacoes longas, acima de 14s para drift e 120s para rotacao.

Evite animacoes rapidas demais. A identidade deve se mover como luz, nao como interface gamificada.

## Prompt Para Outras IDEs

Use este bloco quando pedir a uma IDE ou agente para aplicar a identidade:

```text
Use o design system Vocaccio:
- Fundo paper quente (#f5f4f0) com gradientes atmosfericos pessego/rosa/azul.
- Texto principal em #201f1d e texto secundario em #55536b.
- Acentos: #e89a7b, #cf6295, #7360aa, #2897bf.
- Gradiente aurora em CTAs, numeros importantes e destaques.
- Tipografia: Cormorant Garamond para titulos grandes, Manrope para UI e corpo.
- Superficies em vidro claro, bordas finas rgba(115,96,170,.16), sombras suaves e blur.
- Hero principal em largura total com banner orbital, sem card, sem container boxed, sem border-radius.
- Conteudo interno do hero centralizado em largura maxima, mas o fundo deve ocupar 100vw.
- Movimento lento e elegante: drift de fundo e orbitas girando lentamente.
- Componentes devem ser funcionais e densos quando forem ferramentas, nunca landing page generica.
```

## Checklist De Implementacao

- O `body` usa `overflow-x: clip` ou equivalente para evitar scroll lateral do hero full width.
- O hero usa `width: 100vw` e `margin-left/right: -50vw` quando estiver dentro de um container.
- Nenhum wrapper limita o fundo orbital a `max-width`.
- O conteudo interno do hero tem `width: min(980px, 100%)`.
- Titulos usam `letter-spacing: 0`.
- CTAs principais usam `var(--aurora)`.
- Cards e paineis usam vidro claro, borda fina e sombras suaves.
- Mobile tem aneis orbitais maiores para manter o enquadramento.
- Textos nao ficam sobrepostos nem cortados em 320px de largura.
