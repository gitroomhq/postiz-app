# System Design Vocaccio — Especificação Oficial (Unificada e Atualizada)

> **Documento Definitivo de Handoff e Referência Visual**
> Este documento consolida a evolução visual da Vocaccio, resolvendo a fragmentação anterior (Postiz vs Vocaccio Clássico) e estabelecendo um único padrão de design: **SaaS Premium com Aura Mágica** (referências: MyDose App, Circle.so).
> Gerado em Junho/2026.

---

## 1. O Novo Conceito Visual

A interface unificada resolve o problema dos "dois produtos colados" (Auth Dark vs Hub Light). O novo padrão exige que o usuário possa escolher entre **Light Mode (Luz)** e **Dark Mode (Sombra)** a qualquer momento, sem que a plataforma perca sua identidade.

- **Diagramação SaaS B2B:** Estruturas geométricas, alinhamentos rigorosos, uso de badges, listas de checkmarks e tipografia funcional. Transmite credibilidade e organização de uma plataforma robusta (inspirado no Circle).
- **Aura Mágica (Motion & Glassmorphism):** Para não ser apenas "mais um SaaS frio", a plataforma injeta a magia Vocaccio através de *ambient glows* animados no fundo, gradientes vivos (Aurora) em botões/textos e painéis translúcidos (Glass).

---

## 2. Paleta de Cores (Tokens Unificados)

Abandonamos os tons opacos e as paletas fragmentadas. As cores oficiais ganham saturação e vibração para funcionarem como "luzes neon" no Dark Mode e "aquarelas vivas" no Light Mode.

### Cores Core ("Caminho do Meio")
Buscamos o equilíbrio perfeito entre a paleta clássica e a saturação neon, resultando em cores ricas, mas confortáveis para longas sessões de uso.
```css
--voc-peach: #F29676;   /* Laranja quente / Dopamina */
--voc-rose: #DF548E;    /* Rosa intenso / Oxitocina */
--voc-violet: #7C5EE1;  /* Roxo marcante / Marca Base */
--voc-blue: #23A6D6;    /* Ciano / Serotonina */
```

### Gradientes de Assinatura
```css
/* Aplicado em botões principais, bordas de destaque e badges Premium */
--voc-aurora: linear-gradient(135deg, var(--voc-peach) 0%, var(--voc-rose) 35%, var(--voc-violet) 70%, var(--voc-blue) 100%);

/* Aplicado em textos (h1, highlights) para destaque (text-fill-color: transparent) */
--text-gradient: linear-gradient(90deg, var(--voc-violet) 0%, var(--voc-rose) 50%, var(--voc-peach) 100%);
```

### Tema Dark (Sombra) - O Padrão Recomendado
Foco em contraste profundo para que as cores vivas "saltem".
```css
--bg-app: #090614;                           /* Roxo extremamente escuro, quase preto */
--bg-surface: rgba(22, 18, 33, 0.25);        /* Fundo de cards em Glass */
--bg-surface-elevated: rgba(35, 28, 33, 0.5);/* Cards elevados (ex: Pricing) */
--text-primary: #FFFFFF;
--text-secondary: #A39DB3;
--border-soft: rgba(255, 255, 255, 0.08);
```

### Tema Light (Luz)
Clean e arejado, focado em legibilidade e sombras mais densas.
```css
--bg-app: #FAFAFA;
--bg-surface: rgba(255, 255, 255, 0.65);
--bg-surface-elevated: rgba(255, 255, 255, 0.85);
--text-primary: #0F0A1A;
--text-secondary: #575266;
--border-soft: rgba(124, 94, 225, 0.15);
```

---

## 3. Efeitos e Motion (A Magia)

A interface não é estática. A camada inferior da aplicação possui glows, órbitas e texturas que tornam a plataforma orgânica e tátil.

### Textura (Noise / Grain) - *Opcional*
Aplicável caso a caso em fundos amplos para trazer um aspecto tátil "premium". Quando usada, aplica-se uma camada fixa de noise/grain no fundo com baixíssima opacidade (ex: 6% no dark mode, 4% no light mode via SVG fractalNoise), mudando o aspecto de "site digital" para "superfície impressa/cinematográfica".

### Efeito Orbital (Orbit Field) - *Opcional e Restrito*
Resgatado dos pacotes visuais da marca, o `.orbital-field` adiciona anéis concêntricos giratórios no fundo. 
**Restrição de uso:** Este efeito é estritamente aplicável apenas em **Headers de Landing Pages (LPs)** e somente sobre **fundos escuros (Dark Mode) ou coloridos**. Nunca deve ser utilizado em fundos brancos/claros (Light Mode) ou misturado com a interface de painel do usuário para não poluir a leitura.

### Ambient Glows
Três radiais de fundo que flutuam lentamente via transformações de `translate` puras, criando uma sensação de ambiente "vivo" e espalhando a aurora de cores pela tela.
```css
--glow-1: radial-gradient(circle at 15% 10%, rgba(124, 94, 225, 0.4), transparent 45vw);
--glow-2: radial-gradient(circle at 85% 90%, rgba(35, 166, 214, 0.3), transparent 45vw);
--glow-3: radial-gradient(circle at 50% 50%, rgba(242, 150, 118, 0.25), transparent 55vw);
```

### Glassmorphism Avançado
Cards e sidebars (onde aplicável) não usam cores sólidas chapadas. Usam desfoque e um leve reflexo superior (glare).
```css
backdrop-filter: blur(48px);
background-image: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%); /* Glare no Dark Mode */
border: 1px solid var(--border-soft);
```

---

## 4. Tipografia e UI Elements

A tipografia deve ser puramente funcional, eliminando conflitos de Helvetica vs Fontes Serifadas em dashboards B2B.

- **Fonte Principal (UI, Tabelas, Inputs, Botões):** `Manrope` (ou `Inter` para números estritos). Tracking levemente reduzido (`-0.02em`) em títulos grandes.
- **Fonte Secundária (Apenas Logos ou Momentos Editoriais Heróicos):** `Cormorant Garamond`.
- **Raios (Border Radius):**
  - Botões, Inputs, Badges, Toggle: `--radius-pill` (`999px`) - *Traz suavidade e convite ao clique.*
  - Cards, Containers Internos: `--radius-md` (`24px`) ou `--radius-lg` (`32px`).

---

## 5. Diretrizes de Diagramação SaaS

Para combater a sensação de "landing page que tenta ser sistema", as seguintes regras estruturais devem ser aplicadas nas telas internas:

1. **Separação por Sub-Cards:** Informações densas (ex: configurações opcionais) não flutuam no card principal. Elas vão para um sub-card interno (`background: rgba(255,255,255,0.02)`), garantindo hierarquia visual imediata.
2. **Uso de Ícones Delimitados:** Ícones de features (estilo "Copiloto IA") não flutuam soltos. Eles ganham um *wrapper* (um quadrado/círculo sutil com borda fina) para demarcar espaço matemático.
3. **Badges Tecnológicos:** Tags como `NEW`, `BETA` ou `PRO` são feitas com fontes pequenas (`10px`), uppercase e tracking largo (`0.05em`), envoltas por uma `border-soft` redonda.

---

## 6. Plano de Migração (Fim da Era "Postiz")

O código do repositório deve ser modificado seguindo estes passos:

1. **Adeus `--new-*` hardcoded:** Os tokens do Postiz (`apps/frontend/src/app/colors.scss`) devem ser preservados apenas no nome, mas seus valores passam a referenciar os novos tokens unificados.
   - *Exemplo:* `--new-btn-primary: var(--voc-violet);` em vez de `#612bd3`.
2. **Refatoração do Tailwind (`tailwind.config.cjs`):**
   - Substituir `Helvetica Neue` por `Manrope`.
   - Adicionar os temas `data-theme='light'` e `data-theme='dark'` corretamente.
3. **Revisão de Componentes Híbridos:** Limpar os arquivos de CRM (`apps/frontend/src/components/hub/crm/*`) que atualmente misturam marcações estáticas dos dois sistemas no mesmo lugar.
4. **Implementar Toggle Global:** Permitir que o usuário troque entre Luz/Sombra no layout raiz, fazendo com que todo o sistema, das Configurações ao CRM, reaja instantaneamente.
