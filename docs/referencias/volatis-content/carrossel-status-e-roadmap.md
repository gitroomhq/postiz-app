# Gerador de Carrosséis — Status & Roadmap (handoff para nova rodada)

> Documento de retomada. Última atualização: 2026-06-19 (após rodada 8). Leia isto + as memórias
> `[[project-fase3-volatis]]`, `[[feedback-vocaccio-ui-host-theme]]`, `[[feedback-context-economy]]`,
> `[[reference-impeccable-skill]]`, `[[project-env-pnpm]]` antes de codar.
> **Começar o próximo chat por:** seção "🎯 PLANO — Dinâmica de Templates" → **Fase 1 (tipos ricos de
> slide)**, COM LOOP VISUAL no browser. Quick wins (tipografia + número decorativo) já feitos na rodada 8.
> Pendentes paralelos: word-highlight (diagnosticar no browser) + teste ponta a ponta do gerador.
> Ver "Fase 1 — INICIADA" + "Ajustes pós-validação" para o estado exato.

## Como rodar e verificar
```powershell
cd C:\dev\vocaccio
pnpm --filter ./apps/frontend run dev   # http://localhost:4200
# (se o backend cair com bcrypt: ver project-env-pnpm — node-pre-gyp install)
```
Editor: **http://localhost:4200/hub/volatis/criar/carrossel** (abre com carrossel mock).
**Verificar SEMPRE no browser** (loop visual via Claude in Chrome), não só typecheck —
o app roda no Chrome logado do Felipe. Referência viva de UX: o gerador de carrosséis de
referência costuma estar aberto numa aba (estrutura/UX; ignorar as cores laranja).

## Arquitetura (já decidida, não refazer)
- **Motor**: `libraries/carousel-engine/` (alias `@gitroom/carousel-engine`, TS puro, sem
  React/Konva runtime). O carrossel é **JSON** (`schema.ts` = contrato do agente Cedrico);
  Konva só renderiza; localStorage persiste (v1, sem backend).
  - `schema.ts` (zod: Carousel→Slide[]→Node[], BrandKit, RichTextRun word-level), `templates.ts`
    (sequências 5/7/9/12 claro/escuro), `palettes.ts` (paleta por nicho + `deriveBrandKit`),
    `layout.ts` (`buildCarousel`: conteúdo→scene graph), `autofill.ts`, `fonts.ts`
    (`ensureFontsLoaded` antes de render/export), `seed.ts` (mock), `export/{png,zip,pdf}.ts`.
- **UI React/Konva**: `apps/frontend/src/components/volatis/carousel/`
  - `carousel-editor.component.tsx` (shell 3 colunas + painéis), `carousel-editor-loader` (dynamic
    ssr:false — Konva é browser-only), `carousel-stage` (fundo+chrome+nós), `rich-text` (word-level
    styling: mede/quebra palavras), `slide-thumbnail`, hooks (`use-carousel-doc` = estado+localStorage,
    `use-carousel-export`, `use-font-loader`, `use-image`, `use-element-size`).
- **Export**: Konva-native `toDataURL` (pixelRatio→1080), JSZip, jsPDF. **NÃO** Playwright/HTML.
- **Cedrico = GPT externo gratuito** (decisão 2026-06-17): **SEM API paga** de IA neste projeto até
  monetizar. O "Cedrico" (codinome interno) é o GPT customizado público **Volatis | Gerador de
  Carrosséis Virais**; o usuário conversa com ele fora do app e **cola a saída** no campo Conteúdo
  do editor. Formato pareado: linhas
  `texto N - …` onde ÍMPAR = primário (título) e PAR = secundário (corpo) de cada slide; nº de pares =
  nº de slides. Parser: `parsePairedText` em `autofill.ts`. (Via futura/premium: super-humanos
  assíncronos — ver `[[project-agentes-backend-super-humanos]]`.)

## Regras visuais (críticas — ver [[feedback-vocaccio-ui-host-theme]])
- **Estrutura = dark do host Postiz** (`bg-newBgColorInner`, `border-newBorder`, `text-newTextColor`,
  `text-textItemBlur`, `bg-newBgColor`, `bg-boxHover`).
- **Cor/acentos = Vocaccio SEMPRE** (`--voc-aurora` em CTAs; `--voc-rose` #cf6295 em toggle/ativo/
  outline/slider). **NUNCA** o roxo `--new-btn-primary` do Postiz.
- Slides usam a paleta da marca do cliente (`deriveBrandKit`), separada da UI.
- Armadilha recorrente de layout: áreas "cheias" precisam de **altura explícita** (não só
  `flex-1 min-h-0`) e os filhos de flex column precisam de **`shrink-0`** (senão o flex espreme e o
  `overflow-hidden` corta). Já mordeu no editor, na home Volatis e nos painéis.

## Estado atual (após rodada 5, 2026-06-17)
Editor 3 colunas funcionando. **Concluído:** painel Texto completo + word-highlight; Fundo (slide +
"aplicar a todos do mesmo tom"); CTA toggle "Mostrar botão"; Campos Globais com paridade total
(handle/marca/copyright/avatar + olhos de visibilidade + "usar como padrão"); barra de topo definível;
**drag-and-drop axis-locked** (texto+imagem) com margem; menu **Postar/Exportar** (export + Postar/Agendar
plugados no compositor do Postiz); sidebar (logo clicável→/hub, menu renomeado Posts/Agente IA/…/Canais);
**Galeria de carrosséis** (`/hub/volatis/carrosseis`) + **persistência multi-carrossel** (store + índice UUID).
**Rodada 4b:** cockpit ganhou **Criar Post** + **Calendário** (à esq. de Carrosséis); Galeria ganhou **Calendário** no header;
**sidebar centralizada**; **globo do idioma** aumentado p/ 24px.
**Rodada 5 (item 5):** ✅ **Desfazer/Refazer** (history stack 50 entradas, `past`/`future` no hook, Ctrl+Z/Ctrl+Y + botões Undo2/Redo2 na toolbar); ✅ **Seletor de Templates** (drawer inline no painel esquerdo, cards visuais com mini-preview de slots por cor, badges escuro/claro, marcação "atual", abre via botão LayoutTemplate); ✅ **Zoom** (25–200% em steps de 10, botões ZoomIn/ZoomOut + display % clicável = reset 100%, Ctrl+=/-, Ctrl+0, canvas escala com `zoom/100`); ✅ **Preview Instagram** (`carousel-instagram-preview.component.tsx` — modal com mock de feed IG: avatar/handle/nome da marca, slides capturados via `slideToDataUrl` (Konva toDataURL), setas prev/next, dots, contador, ações Heart/Comment/Send/Bookmark, legenda truncada, fecha com Esc/clique fora). Tudo em `apps/frontend` e `libraries/carousel-engine`.
Ver a tabela de gap abaixo para o que falta por painel. **Próximo: item 3 (Mídia em slots) ou item 6 (Plugar Cedrico).**

## Gap vs. referência (o que construir nesta rodada)
> **Feito em 2026-06-16 (rodada 2):** painel **Texto completo** (fonte, alinhamento,
> negrito/itálico, tamanho, entrelinha, kerning) + **word-highlight** (clicar palavra
> selecionada → toggle accent da marca). Ferramenta renomeada para **Volatis | Gerador
> de Carrosséis**. **Barra de topo** dos frames agora é cor sólida definível em Cores
> Globais (`brand.accentBar`, default = primary; fallback gradiente p/ docs antigos).
> Schema ganhou `TextNode.italic` e `BrandKit.accentBar`. Tudo verificado no browser.
>
> **Integração com o motor de publicação (rodada 2):** os 3 botões PNG/.zip/PDF viraram
> um menu **"Postar / Exportar"** (`use-carousel-publish.hook.tsx`). Postar/Agendar
> exporta os slides → sobe em `/media/upload-simple` (mesmo endpoint do Polotno) → abre
> o `AddEditModal` do Postiz com `onlyValues[].image` (slides anexados) +
> `selectedChannels` = canais do cliente ativo (`/integrations/list?clientId=`). `useModals`
> é store global (zustand) → funciona fora do calendário. Guard: se o cliente não tem canal,
> mostra toast em vez de abrir modal vazio (AddEditModal renderiza null sem integrations —
> NÃO abra sem guard, o modal fica preso sem botão de fechar). Verificado: menu + fluxo +
> guard funcionam; o composer *populado* não pôde ser testado pois a conta dev não tem
> canais conectados (limite de ambiente, não bug).

| Painel | Temos | Falta |
|---|---|---|
| **Texto** | ✅ fonte, alinhamento, negrito/itálico, tamanho, kerning, entrelinha, word-highlight | — |
| **Mídia** | ✅ grid de slots numerados — click p/ selecionar slide + upload por slot, mini-preview do fundo, ícone hover | — |
| **Fundo** | ✅ slide ativo + **"Aplicar a todos os slides"** (mesmo tom) | — |
| **CTAs** | ✅ toggle **"Mostrar botão"** + rótulo (pill no rodapé dos frames) | só renderiza no último slide (opcional) |
| **Campos Globais** | ✅ paridade com a referência: handle/marca/copyright + **avatar** (Trocar/upload, olho, círculo no rodapé), olho em todos, marca renderiza no rodapé, **"Usar como padrão em novos carrosséis"** | — |
| **Histórico** | — | saves + Restaurar (localStorage) |
| **Template** | ✅ seletor inline (drawer) com cards visuais 5/7/9/12 slides | — |
| **Topbar/Frames** | ✅ menu **Postar / Exportar** · ✅ **Desfazer/Refazer** · ✅ **Zoom** · ✅ **Preview IG** · ✅ **Salvar** (Ctrl+S) · ✅ **⋮ por slide** (Duplicar/Excluir/Definir como capa) · ✅ **Drag-and-drop** p/ reordenar frames (HTML5 nativo, grip lateral) | — |
| **Galeria** | ✅ `/hub/volatis/carrosseis` — grid de cards, abas por cliente, Abrir/Duplicar/⋮, capa, badges | — |
| **Persistência** | ✅ `carousel-store.ts` — UUID, índice por cliente, migração 'draft', setCover | backend (Fase futura) |

## Ordem recomendada
> **Rodada 3 (2026-06-16):** ✅ **Fundo "Aplicar a todos os slides"** (`setAllSlidesColor(color, kind)`
> no hook — recolore só os slides do mesmo tom, preserva contraste) + ✅ **CTA toggle "Mostrar botão"**
> (`carouselSchema.ctaButton {show,label}`, pill no chrome do `carousel-stage`, cor = `accentBar||primary`;
> `Toggle` novo no editor). Pill renderiza **só no último slide** (`index === total-1`).
>
> **Drag-and-drop (rodada 3b):** nós de texto E imagem são arrastáveis com **trava de eixo** (sem
> diagonal — lock no eixo dominante desde o onDragStart) + **margem segura** (`DRAG_MARGIN=56`).
> Lógica em `drag.util.ts` (`makeAxisLockBound`, dragBoundFunc em coords absolutas ÷ scale); RichText e
> SlideImage recebem `scale`+`canvasH`+startRef. Verificado: vertical/horizontal lock + clamp.
>
> **Sidebar:** logo Vocaccio centralizado (`w-full flex justify-center`) e clicável → `/hub` (dashboard
> mágico) em `new-layout/layout.component.tsx`. Antes ficava encostado à esquerda (svg 44px fixo numa
> coluna de 64px, enquanto os MenuItem são `w-full`).

1. ~~Texto completo + word-highlight~~ ✅
2. ~~Fundo (todos os slides) + CTAs~~ ✅
3. ~~**Mídia em slots numerados 1–10** (arrastar/reordenar) + **Trocar Capa / ⋮ nos Frames**~~ ✅ (rodada 5b, 2026-06-17)
4. ~~**Home / Galeria de carrosséis** + **modelo de persistência multi-carrossel**~~ ✅ (rodada 4, 2026-06-17)
5. ~~**Preview Instagram** (modal mock de feed), desfazer/refazer, zoom, **seletor de templates**~~ ✅ (rodada 5, 2026-06-17)
6. ~~**Plugar o agente Cedrico**~~ ✅ (rodada 6, 2026-06-17) — **sem API paga**: parser do formato pareado
   do GPT externo (Máquina de Carrosséis). `parsePairedText` + `countPairs` em `autofill.ts`; capa e CTA
   agora pareados (subtítulo na capa, corpo no CTA com última frase realçada via `emphasizeLastSentence`);
   `buildDynamicSequence` gera claro/escuro p/ qualquer N; painel "Conteúdo (Cedrico)" com placeholder do
   formato + contador "N slides ao aplicar". Validado: 18 textos → 9 slides.

### Nomenclatura (decisão Felipe, 2026-06-17)
- **"Cedrico" é codinome INTERNO** (memórias, comentários de código, nomes de arquivo). O nome
  **PÚBLICO** do agente/ferramenta é **"Volatis | Gerador de Carrosséis Virais"**.
- **Nunca citar a fonte original da metodologia** em nada voltado ao usuário — apresentar a
  inteligência viral como know-how próprio da Volatis. O system prompt instrui o GPT a não citá-la,
  e os arquivos de Knowledge já foram limpos das menções à fonte (rodada 6c).
- **Evitar hífen/travessão** como recurso de pontuação no produto e na copy dos carrosséis.

### GPT criado e ligado à UI (2026-06-19)
- GPT público **Volatis | Gerador de Carrosséis Virais** criado no ChatGPT:
  `https://chatgpt.com/g/g-6a34b66d8cd08191950cac600f531b14-volatis-gerador-de-carrosseis-virais`
- Link embutido no editor (`carousel-editor.component.tsx`, const `VIRAL_GPT_URL`) como botão aurora
  **"Abrir o Gerador de Carrosséis Virais"** no painel Conteúdo (IA), acima do "Exportar briefing".
- URL também salva na memória `[[reference-volatis-gpt]]`.

### Cedrico — GPT externo (rodada 6b, 2026-06-17)
- **`cedrico-gpt-instructions.md`** — system prompt pronto p/ colar no GPT Builder (OpenAI). Destila a
  metodologia viral (identidade, fluxo, 8 padrões de hook + gatilhos, arcos narrativos, filtro anti-AI-slop)
  e fixa o **formato de saída pareado** `texto N` que o `parsePairedText` lê. Os 5 docs grandes
  (`design-system`, `principios-design`, `banco-de-headlines`, `filtro-editorial`, `manual-de-qualidade`)
  vão como **Knowledge** anexo do GPT.
- **`cedrico-briefing-template.md`** — estrutura do briefing que a pessoa anexa por conversa.
- **Export no editor**: botão **"Exportar briefing p/ o GPT"** no painel Conteúdo (`cedrico-briefing.ts`
  → `buildBriefing`/`downloadBriefing`) baixa um `.md` pré-preenchido com o BrandKit atual (marca,
  @handle, cor, estilo, CTA, nº de slides) + placeholders p/ nicho/público/tema/headline. Quando o
  Religare existir (Fase 5), o PDF dele preenche tom de voz/público/palavras-chave.

### Ajustes pós-validação do Felipe (2026-06-19, rodada 7)
Feedback após primeiro uso real (com o GPT publicado). Status:
- ✅ **Aplicar texto preserva imagens** — `applyAutofill` agora mescla as imagens de fundo já postas
  (por índice) e mantém o texto branco sobre elas. Cores/campos globais já eram preservados (brand).
- ✅ **Brand bar no cabeçalho** — avatar + nome + @handle movidos do rodapé para o topo
  (`carousel-stage`, `headerY`); copyright foi p/ topo direito; tag abaixo do cabeçalho. Rodapé fica
  só com progress bar + page number.
- ✅ **Word-highlight — diagnosticado e corrigido (rodada 9c, 2026-06-19, sem browser, via leitura de
  código + Konva docs):** causa raiz era exatamente o suspeito original — conflito clique vs drag do
  `Group`. Konva considera "arraste" qualquer movimento >`dragDistance` (padrão **3px**) entre
  mousedown/mouseup; jitter normal de mouse/trackpad ao clicar numa palavra facilmente excede isso,
  o que cancela o evento `onClick` e dispara `onDragEnd` em vez do toggle. Fix: `dragDistance={12}` no
  `Group` de `rich-text.component.tsx` (Konva suporta esse atributo por nó, documentado em
  `Node.d.ts`). **Não validado no browser ainda** — Felipe testar e confirmar com print/uso real;
  se ainda falhar, o 2º suspeito é o fluxo "1º clique seleciona, 2º clique no mesmo lugar destaca"
  (`handleToken` em `rich-text.component.tsx`) exigir um clique exato na mesma palavra duas vezes.
- 📋 **Reaproveitamento por cliente/projeto** — cores globais + campos globais + template favorito por
  cliente. Hoje os brand-defaults são GLOBAIS (`vocaccio:carousel:brand-defaults`); precisa virar
  **por crmClientId**. A fazer.
- ✅ **Agente ajustado** — `cedrico-gpt-instructions.md`: não pergunta mais sobre visual (cor/estilo);
  pede o DNA do Projeto 1x por chat e segue se não tiver; passo "Contexto" lê marca+experts.
- ✅ **Nomes + estrutura definidos** (Felipe, 2026-06-19): agente/GPT = **Volatis | Redator**;
  app/editor = **Volatis | Gerador de Carrosséis Virais**; briefing = **DNA do Projeto** (Marca +
  Expert, por marca com experts dentro, N:N). UI/export/system prompt/template atualizados. ⚠️ Felipe
  precisa **renomear o GPT** no GPT Builder p/ "Volatis | Redator".
- 📋 **Reaproveitamento por cliente** (cores/campos/template favorito por `crmClientId`) — ainda a fazer.
- 🔍 **Word-highlight** — ainda a diagnosticar no browser.

### Ajustes de chrome (Felipe, 2026-06-19, rodada 7c)
- ✅ **Fontes dos campos globais +~4px** (`carousel-stage`): brandName 20→24, handle 16→20, copyright
  16→20, tag 13→17, paginação 14→18, avatar 52→56. Estavam pequenas demais (feedback do 1º uso).
- ✅ **Visibilidade da marca por slide** — `Slide.hideBrandFields?` (schema). Override individual:
  oculta avatar+nome+@+copyright SÓ naquele slide (estrutura/accent bar/progresso permanecem). UI
  **sem poluição**: opção "Ocultar/Mostrar marca" no menu **⋮** de cada frame (já existente) +
  indicador `EyeOff` rosa no rótulo do slide quando oculto. O controle GLOBAL (painel Campos Globais,
  por campo) permanece. Hook: `toggleSlideBrandFields`.

### Decisões de produto (Felipe, 2026-06-19, rodada 7b)
- **Projeto = unidade flexível.** Abandonada a modelagem rígida marca/expert N:N. Cada **Projeto**
  (= Client CRM, já existe; abas da galeria) tem um **DNA do Projeto** livre que descreve marca e/ou
  experts conforme o caso — o usuário decide projeto a projeto. Zero modelagem relacional nova.
- **"Aplicar texto" = import one-way.** Vira ponto de entrada inicial; depois o **preview é a fonte da
  verdade** (edição inline direto nos slides). Reaplicar texto **avisa que sobrescreve**. Sem sync reverso.

### 🎯 PLANO — Dinâmica de Templates (inspirada na BD, atmosfera Vocaccio)
> Estruturas de diagramação/tipografia/posição estão em `volatis-design-system.md` (HTML/CSS por tipo
> de slide) + `volatis-referencias.md` (exemplos completos). O plugin Figma (`decoded/Content Machine.4.02`)
> é só o renderizador — NÃO é fonte. Começar com **3 templates** e expandir.
- **Fase 1 — Vocabulário de slides** (`layout.ts`+`schema.ts`): tipos de diagramação além de título+corpo
  — card numerado, tabela de dados, img-box (foto no topo), lista com setas (→), citação, tweet-style,
  gradient+bullets. Cada tipo = função de layout que posiciona os nós. Resolve o "template pobre".
- **Fase 2 — Catálogo de templates** (`templates.ts`): cada template = nome + etapa de funil (topo/meio/
  fundo) + sequência de tipos de slide + paleta. 3 iniciais, com thumbnail.
- **Fase 3 — Modal de seleção** (novo, ao criar carrossel): inspirado na tela 3 da BD (seções por funil +
  cards de template com preview + nome + criar), na atmosfera Vocaccio (dark host + aurora/rosa, NUNCA
  laranja BD). Substitui o "Novo carrossel" direto.
- **Fase 4 — Reaproveitamento por projeto** (`carousel-store`): cores globais + campos globais + template
  favorito salvos por `crmClientId` (hoje são globais). Novo carrossel herda os defaults do projeto.
  **Detalhado (Felipe, 2026-06-19):** chave passa de `vocaccio:carousel:brand-defaults` (global, única)
  para `vocaccio:carousel:project-defaults:{crmClientId}` (uma por projeto); `loadBrandDefaults`/
  `saveBrandDefaults`/`hasBrandDefaults`/`clearBrandDefaults` ganham parâmetro `crmClientId` (fallback
  `__none__` p/ carrosséis sem cliente). `createNewCarousel` já chama `loadBrandDefaults` — só precisa
  passar o `clientId` que já recebe. **Override por carrossel continua possível** (o doc carrega os
  defaults só na criação; depois é independente — igual já funciona hoje). UI: no painel Cores/Campos
  Globais, o botão "Salvar como padrão" já existe — só precisa salvar com o `crmClientId` do carrossel
  atual em vez da chave global; on criação de novo carrossel dentro de um projeto, puxa o default daquele
  projeto. **Fontes favoritas por projeto:** lista de fontFamily marcadas como favoritas por
  `crmClientId` (chave própria, ex. `vocaccio:carousel:favorite-fonts:{crmClientId}`), aparecem em
  destaque (seção "Favoritas do projeto" no topo) no seletor de fonte do painel Texto — mas **NÃO
  restringe** a escolha nem se torna padrão global da paleta (decisão: fonte mexe na diagramação/medição
  de texto por slide, então fica sempre uma escolha explícita por nó, nunca herdada automaticamente como
  cor é). Implementação: ~3 arquivos (`carousel-store.ts` p/ as chaves, painel de Cores Globais p/ passar
  `crmClientId`, seletor de fonte do painel Texto p/ ler+exibir favoritas). Não fazer agora — fila depois
  dos tipos de slide (Fase 1) e do catálogo de templates (Fase 2/3).
- **Fase 5 — Edição inline no preview**: double-click no texto → textarea overlay → salva nos runs.
  Import one-way + aviso ao reaplicar.
- Sequência recomendada: 1 → 2 → 3 → 4 → 5. Fundação primeiro (vocabulário), depois a cara (modal).

**Catálogo de tipos de slide (levantado de `volatis-design-system.md`, validado pelo Felipe):**
Big Stat (número 200px), Card destaque (dark/light, border-left acento), Lista/Pattern (pcard ou setas →),
Tabela (2 colunas, th primary), Img-box (foto no topo + texto), Gradient+lista, CTA keyword box.
**Tamanhos BD:** dark-h1 80px/900, light-h1 72px/900, body 38px, dark-big-stat 200px, dark-bg-num 380px@4%.
**3 templates iniciais aprovados:** (1) Topo "Gancho/Tese" 9 slides; (2) Meio "Lista Prática" 7; (3) "Notícia/Tweet" 7.

**Fase 1 — INICIADA (2026-06-19, rodada 8):**
- ✅ **Tipografia dos títulos internos** corrigida p/ a BD: `bodySlideNodes` em `layout.ts` — título 60→
  **80 (dark) / 72 (light) / 84 (grad)**, peso 800→**900**, uppercase, lineHeight 1.0, letterSpacing -2/-1.5.
- ✅ **Número decorativo gigante** de fundo nos slides dark (`carousel-stage`): índice do slide em 380px
  rgba(255,255,255,0.05) ancorado à direita — a profundidade visual marcante da BD.

**Fase 1 — tipos ricos (rodada 9, 2026-06-19, via agente Flitwick):**
- ✅ **Fundação**: `ShapeNode` (kind: 'shape', com `borderLeftColor`/`borderLeftWidth`) no `schema.ts`;
  `Slide.layout` (`'default'|'stat'|'card'|'list'|'table'|'img-box'`, default `'default'`). Render do
  ShapeNode em `carousel-stage.component.tsx`. Painel **"Diagramação"** novo no editor (entre Cores
  Globais e Texto, só p/ slides internos) com toggle por tipo; `setSlideLayout` em `use-carousel-doc.hook.ts`
  reaproveita o texto já digitado (extrai dos 2 primeiros nós de texto) e chama `bodySlideNodes` de novo.
- ✅ **Big Stat** — `statSlideNodes` em `layout.ts`: número 200px/900/-8 em `brand.primary` (usa
  `content.title`, ex. "73%") + label 30px/500 translúcido abaixo (usa `content.body`). Validado dark;
  variante light (label `rgba(15,13,12,0.45)`) implementada mas não confirmada visualmente ainda.
- ✅ **Card destaque** — `cardSlideNodes` em `layout.ts`: `ShapeNode` (caixa) + título+corpo dentro do
  padding. Specs BD respeitadas: dark `rgba(255,255,255,0.04)` / border-left 6px / radius 16 / padding
  44×48; light `#fff` / border-left 7px / radius 18 / padding 52×56. Render: `SlideShape` usa `clipFunc`
  (Group + path com `arcTo`) p/ a borda esquerda acompanhar os cantos arredondados (Rect simples sem
  radius destoava). Altura do card = heurística por contagem de caracteres (⚠️ grosseira — revisar com
  conteúdo real variado, textos muito longos/curtos podem desproporcionar o padding vertical). Validado
  dark (slide Hook) e light (slide Contexto) no browser real.
- ⏳ **PAUSADO (decisão Felipe, 2026-06-19 — economia de token):** Lista/Pattern, Tabela, Img-box
  ficam para uma rodada visual dedicada (Felipe vai mandar prints com ajustes em vez de loop de browser
  via agente — o Flitwick com Claude in Chrome consumiu token demais/ficou parado). Retomar quando
  Felipe trouxer feedback visual; até lá, **não reabrir browser/CDP nesta fase** sem pedido explícito.

### ✅ Fase 4 — Config global por projeto (rodada 9b, 2026-06-19, implementado sem browser/agente)
- **`carousel-store.ts`**: `vocaccio:carousel:brand-defaults` (global, única) → `vocaccio:carousel:
  project-defaults:{crmClientId|__none__}` (uma por projeto). Migração automática e idempotente da
  chave legada para o bucket `__none__` (`migrateLegacyBrandDefaults`, roda lazy em `loadBrandDefaults`/
  `hasBrandDefaults`). `loadBrandDefaults`/`hasBrandDefaults`/`saveBrandDefaults`/`clearBrandDefaults`
  agora recebem `clientId` como 1º parâmetro.
- **Fontes favoritas por projeto**: `vocaccio:carousel:favorite-fonts:{crmClientId|__none__}` (array de
  fontFamily); `loadFavoriteFonts`/`toggleFavoriteFont`. **Não são herdadas automaticamente** — só
  aparecem em destaque (`<optgroup>` "Favoritas do projeto" no topo do seletor de fonte do painel
  Texto) com botão estrela (`--voc-rose` quando marcada) ao lado do `<select>`.
- **`use-carousel-doc.hook.ts`**: todas as chamadas passam `crmClientId` (já recebido pelo hook);
  novo estado `favoriteFonts` + `toggleFavoriteFontFamily`, expostos no retorno do hook.
- **`carousel-editor.component.tsx`**: label do checkbox "Usar como padrão" agora deixa claro que é
  por projeto ("...p/ novos carrosséis deste projeto"); seletor de fonte ganhou `<optgroup>` de
  favoritas + estrela toggle.
- **Override por carrossel preservado**: defaults só são lidos em `createNewCarousel` (na criação);
  depois o doc é independente — igual já funcionava antes, sem mudança de comportamento aí.
- Validado só por `tsc --noEmit` (sem browser, a pedido do Felipe) — **falta confirmar visualmente**:
  troca de projeto no cockpit reflete defaults certos, estrela toggla e o optgroup aparece, e a
  migração da chave legada não perde dados de quem já tinha "usar como padrão" configurado antes.

### ✅ Fase 4b — Configurações do projeto na Galeria (rodada 9d, 2026-06-19, sem browser)
Felipe trouxe prints de referência da BD (Home com abas de projeto + estado vazio por projeto) e pediu
para unir a Fase 4 (defaults por projeto) a uma UI editável direto na Home/Galeria, sem precisar abrir
um carrossel para mexer em cor/campo/fonte.
- **Novo arquivo**: `project-settings.component.tsx` (`ProjectSettingsModal`) — modal com Campos Globais
  (marca/@handle/copyright/avatar), Cores Globais (primária/barra de topo/fundo claro/fundo escuro) e
  **Fontes favoritas do projeto** (lista scrollável de `CAROUSEL_FONTS` com estrela toggle, grava direto
  via `toggleFavoriteFont`). Botão "Salvar padrão do projeto" chama `saveBrandDefaults(clientId, brand)`;
  "Limpar" chama `clearBrandDefaults` e reseta pro padrão Vocaccio (`deriveBrandKit({})`).
- **`carousel-gallery.component.tsx`**: botão **"Configurações do projeto"** (ícone `Settings2`) no
  cabeçalho da lista de carrosséis — só aparece quando uma aba de projeto específica está ativa (não em
  "Todos", que não tem `crmClientId`). Abre o modal sobre a galeria.
- **Decisão de design**: mesma chave/funções de `carousel-store.ts` já criadas na Fase 4 — o modal é só
  outra porta de entrada pro mesmo dado que o toggle "Usar como padrão" do editor já escreve. Nenhuma
  duplicação de fonte de verdade.
- **Não validado visualmente ainda** (Felipe vai testar e mandar print).

### ✅ Fase 4c — Redesenho da home de projetos (rodada 9e, 2026-06-19, Opus, replanejado)
Felipe testou a 9d e apontou que foi mal planejada (ver `[[feedback-plan-before-building]]`): TODO
cliente do CRM virava aba (poluição + scroll horizontal feio), não havia setup de config ao criar, nem
onde excluir config, e o botão de config era desconectado. Replanejado com 2 decisões dele (AskUserQuestion):
**(1) só projetos ativados; (2) recursos: setup ao criar + aplicar aos existentes + copiar de outro projeto.**
- **Motor** `reskin.ts` → `reskinCarousel(doc, brand)`: reaplica um BrandKit a um carrossel já montado —
  recolore fundos `light`/`dark` baked, ajusta `fill` base de contraste (preserva fills/word-accents
  manuais), remapeia `run.color`/`highlight` que eram o primary/accent antigos. Exportado no barrel.
- **Store** (`carousel-store.ts`): `isProjectActivated(clientId)` (tem carrossel OU config) — fonte da
  verdade de "quais projetos aparecem"; `copyProjectConfig(from, to)` (brand defaults + fontes
  favoritas); `applyBrandToProjectCarousels(clientId, brand)` (itera docs do índice, `reskinCarousel`+
  `saveDoc`, retorna nº atualizado).
- **Galeria** (`carousel-gallery.component.tsx`): abas só de `activatedClients`, com `flex-wrap` (quebra
  linha, **sem scroll horizontal**); "+ Adicionar projeto" abre `AddProjectModal`; "Configurações do
  projeto" só em aba específica; após salvar/limpar/aplicar, re-lista e se o projeto desativou volta p/
  "Todos".
- **`add-project.component.tsx`** (novo): escolher cliente CRM existente (não ativado) OU criar novo
  (`POST /hub/crm/clients` via `useCrmMutations`) + "herdar config de…" opcional → ativa (grava defaults,
  copiados ou padrão Vocaccio) → galeria seleciona e **abre o setup de config** (satisfaz "setup ao criar").
- **`project-settings.component.tsx`**: ganhou "Copiar configurações de outro projeto" (select no topo) +
  "Aplicar aos N carrosséis existentes" (com confirmação de sobrescrita) + `onChanged` p/ a galeria
  re-listar. Edita/salva/limpa config = CRUD completo da config global.
- **Semântica de "excluir"**: "Limpar" remove a config do projeto; a aba some se o projeto não tiver
  carrosséis (desativa). NÃO apaga o Client do CRM (perigoso, outro fluxo). Não há "remover projeto com
  carrosséis" (teria que apagar os carrosséis) — decidir com Felipe se precisa.
- Validado por `tsc --noEmit` (sem browser). **Falta validar visualmente** + confirmar que o
  `applyBrandToProjectCarousels` recolore certo (especialmente word-accents e fundos).
- 🐛 **Bug corrigido (mesma rodada):** o modal "Adicionar projeto" só mostrava "Novo cliente" (sem a
  opção "Cliente existente") porque `useClientsAll` (em `use-clients-all.hook.ts`) usa
  `revalidateIfStale:false` + `fallbackData:[]` → NÃO busca ao montar; numa entrada direta na galeria o
  cache do SWR fica vazio (sem abas de projeto E sem clientes p/ escolher). Fix: a galeria agora chama
  `reloadClients()` (mutate do SWR) num `useEffect` de mount. ⚠️ Padrão a lembrar: telas que entram
  direto e dependem de `useClientsAll` precisam forçar o fetch — o hook não revalida sozinho.
- Pendências de UI da ref BD ainda fora de escopo: `⋮` na aba (renomear/excluir projeto), ordenação
  A-Z/Recentes das abas, "cor-semente → paleta" (não priorizado por Felipe agora).

### ✅ Rótulo Marca/Expert + fontes (rodada 9f, 2026-06-19)
- **Rótulo "Cliente/Projeto" → "Marca/Expert"** em toda a galeria/modais (header das abas, "Adicionar
  marca/expert", modal add, "Configurações da marca/expert", empty state). ⚠️ Isso **REATIVA o N:N
  marca↔expert** que estava marcado como abandonado — ver memória `[[project-fase3-volatis]]` bloco
  "N:N reativado". Por ora a entidade ainda é UMA (o Client CRM); só o rótulo mudou. N:N real (entidades
  separadas + junção) = schema/backend a planejar quando Felipe pedir.
- **Avatar**: label "Trocar avatar padrão" → "Trocar avatar / foto de perfil".
- **Fontes (+6)**: Poppins, Open Sans, Lato, Raleway, Oswald + Comfortaa em `fonts.ts`. ⚠️ Pesos agora
  são **por família** (`FONT_WEIGHTS` + `weightsFor`) — Oswald/Comfortaa (máx 700), Open Sans (máx 800),
  Lato (sem 500/800) quebravam o CSS2 do Google Fonts ao pedir peso inexistente. `googleFontsHref` e
  `ensureFontsLoaded` usam os pesos certos por fonte.
- **Preview da fonte**: o seletor do modal de config (`project-settings`) escreve cada nome na própria
  tipografia (botões, não `<option>`); a **galeria agora chama `useFontLoader`** p/ injetar o `<link>` e
  o preview renderizar (antes só o editor carregava as fontes). Editor segue com `<select>` nativo (option
  font não é confiável no Chrome) — melhorar depois se quiser preview lá também.
- Validado por `tsc --noEmit`. **Falta validar visualmente** (preview das novas fontes carregando).

### ✅ Ajustes pós-2º teste no editor (rodada 9g, 2026-06-19)
Feedback do Felipe após criar um carrossel real sob a marca "Camila Caeron":
1. ✅ **Palavras de destaque não herdavam a config** (continuavam laranja do mock). Causa: `createNewCarousel`
   só trocava `doc.brand`, sem recolorir o conteúdo já assado. Fix: agora chama `reskinCarousel(mock, merged)`
   na criação → remapeia as cores de palavra (primary/accent antigos → novos). ⚠️ Carrosséis JÁ criados antes
   do fix: usar "Aplicar aos existentes" no modal de config da marca/expert (também usa reskin).
2. ✅ **Rodapé mal diagramado** (1/9 minúsculo e colado na linha). `carousel-stage`: rodapé refeito — barra
   mais grossa (4px), paginação 18→**24px** centralizada verticalmente, track encurtado p/ não correr sob o
   número, subiu p/ `nativeH-78`.
3. ✅ **Toggle de rodapé por slide** — `Slide.hideFooter` + item "Ocultar/Mostrar rodapé" no menu ⋮ do slide.
4. ✅ **Toggle do número de fundo por slide** — `Slide.hideBgNumber` + item no ⋮ (só em slides dark).
5. ✅ **Editar texto vs destacar palavras** — o clique-destaca impedia editar o texto. Painel Texto ganhou
   toggle **Editar texto / Destacar palavras** (default Editar). Em "Editar" há uma **textarea** do conteúdo
   do nó (`setNodeText` → run único; avisa que zera destaques do bloco) e o clique na palavra só seleciona.
   Em "Destacar" o clique colore (comportamento antigo). Inline-edit no canvas (Fase 5) segue futuro; isto é
   a v1 via painel.
6. ✅ **Cor de destaque escolhível** — estado `highlightColor` (default accent da marca) + input/color +
   swatches (accent, branco, escuro da marca) no modo Destacar; `toggleWordColor` usa essa cor. Permite
   destaques diferentes por fundo. ⚠️ Limite atual: a cor é global do editor (não memoriza por slide); o
   usuário troca a cor antes de clicar nas palavras de cada fundo.
- Tudo por `tsc --noEmit`. **Falta validar visualmente** (especialmente o rodapé e o fluxo dos 2 modos).

### ✅ Fase 1 COMPLETA — Lista, Tabela, Img-box (rodada 9h, 2026-06-19)
Os 3 tipos restantes do vocabulário de slides, em `layout.ts` (mesmo padrão de stat/card):
- **Lista/Pattern** (`listSlideNodes`): light = cards numerados (.light-pcard: ShapeNode branco borda
  1.5 + .light-pnum accent + .light-ptitle 30/800); dark/grad = linhas com seta "→" (run da seta em
  rgba translúcido + texto). Itens = linhas do corpo (split por `\n` ou `;`), até 5.
- **Tabela** (`tableSlideNodes`): estilo .light-table — header ShapeNode com fundo accent (th 16/700
  uppercase branco) + linhas de dados (td 26/500) com borda inferior (ShapeNode 1px). Linhas = corpo;
  colunas separadas por "|"; 1ª linha = cabeçalho; até 7 linhas.
- **Img-box** (`imgBoxSlideNodes`): caixa de imagem no topo (ImageNode se houver `imageUrl`, senão
  ShapeNode placeholder com borda) + título/corpo abaixo.
- Toggle "Diagramação" no editor virou grid 3 col com os 6 tipos; hint contextual p/ list/table explica
  o formato (1 item por linha / "col1 | col2", 1ª linha = cabeçalho).
- ⚠️ **Limitação conhecida (round-trip de conteúdo):** o conteúdo multi-item (lista/tabela) é derivado do
  `body` no momento da troca de layout via `setSlideLayout` (lê o texto dos nós). Fluxo recomendado:
  escrever o corpo multilinha em "Editar texto" no layout Padrão → trocar p/ Lista/Tabela. Voltar de
  Lista→Padrão é LOSSY (lê os 2 primeiros nós, que viraram itens). Fix robusto = guardar `content`
  (title/body/items) no nível do slide separado dos nós renderizados (refator futuro, alinhado à ideia
  original "JSON content → scene graph"). Decidir com Felipe se incomoda.
- Validado por `tsc --noEmit`. **Falta validar visualmente** cada tipo (design fino — Felipe manda print).

### ✅ Fase 2 COMPLETA — Catálogo de templates (rodada 9i, 2026-06-19)
- `templates.ts`: `TemplateSlot` ganhou `layout?` (diagramação por slot). Novo `CarouselTemplate`
  (id/name/funnel/description/slots) + `CAROUSEL_TEMPLATES` (3 modelos) + `FUNNEL_LABELS` + `findTemplate`.
  Os 3: **Gancho/Tese** (topo, 9 slides — usa card+stat+list), **Lista Prática** (meio, 7 — list+card+table),
  **Notícia/Citação** (topo, 7 — img-box+card). ⚠️ "Notícia/Tweet" virou "Notícia/Citação": não há layout
  tweet dedicado ainda; usa card como bloco de citação. Criar tipo tweet é futuro se Felipe quiser.
- `buildCarousel` aceita `sequence?: TemplateSlot[]` (default = por contagem) e propaga `slot.layout` p/
  `bodySlideNodes` + grava `slide.layout`. Assim um template nomeado gera os slides já com a diagramação.
- Editor: novo `applyNamedTemplate(tpl)`; o drawer "Templates" agora tem seção **Modelos** (3 cards por
  funil, com mini-preview dos slots + badge de funil) acima da seção **Por nº de slides** (5/7/9/12 antiga).
- Aplicar um modelo redefine os slides com conteúdo vazio (mesmo comportamento dos cards de contagem); o
  usuário aplica o texto depois. Identidade visual (brand) preservada.
- Validado por `tsc`. **Falta validar visualmente.**
### ✅ Fase 3 COMPLETA — Modal de seleção ao criar (rodada 9j, 2026-06-19)
Alinhado com Felipe antes de codar (AskUserQuestion): **"Novo carrossel" SEMPRE abre o modal** (3
modelos por funil + "Começar em branco"), só depois cria o doc e abre o editor.
- `carousel-store.ts`: `createNewCarouselFromTemplate(clientId, template, id?)` — monta via
  `buildCarousel` com `sequence: template.slots`, identidade do projeto (`loadBrandDefaults`), slides
  internos vazios. "Começar em branco" continua usando `createNewCarousel` (comportamento antigo,
  preservado).
- **`template-select.component.tsx`** (novo): modal — "Começar em branco" no topo + os 3
  `CAROUSEL_TEMPLATES` com mini-preview dos slots + badge de funil + descrição.
- **`carousel-gallery.component.tsx`**: `onNew` agora abre o modal (`showTemplateSelect`);
  `onTemplateSelected(template|null)` cria o doc certo e navega pro editor. `EmptyState` (mesmo botão
  "Criar carrossel") herda o novo fluxo automaticamente.
- Validado por `tsc --noEmit`. **Falta validar visualmente** (especialmente se os 3 modelos produzem
  slides com a diagramação certa ao abrir no editor).

Fase 4 (per-projeto) e Fase 4b/c já feitas. Fase 5 (edição inline no canvas) + refator de `content` no
nível do slide (resolve o round-trip lossy da lista/tabela) ficam para depois — **dinâmica de templates
do gerador de carrosséis está com TODAS as 5 fases do plano original entregues** (Fase 1-3 + 4 vira 4b/c).

## N:N Marca↔Expert (decisão Felipe 2026-06-19, via Opus)
Modelo aprovado (AskUserQuestion): **Marca = Client do CRM** (existente); **Expert = entidade nova**,
N:N com marcas. **Carrossel = Marca + Expert opcional** (voz/autor). **Visual na Marca** (cores/handle/
logo/fontes — já é per-Client no localStorage), **voz/DNA no Expert** (backend).

### ✅ Fase 1 — Backend (rodada 10, 2026-06-19)
- `schema.prisma`: novos `Expert` (orgId, name, role, avatarUrl, handle, bio, toneOfVoice, audience,
  keywords, dna, soft-delete) + `ClientExpert` (junção N:N, unique [clientId, expertId]); back-relations
  `Client.experts`, `Organization.experts`.
- `dtos/crm/expert.dto.ts`: Create/Update/ListExpertsDto.
- `crm.repository.ts`: list/get/create/update/softDelete/expertBelongsToOrg + listExpertsForClient +
  link/unlink (upsert/deleteMany no ClientExpert). Injetou `PrismaRepository<'expert'>`/`<'clientExpert'>`
  (mesmo provider, sem mudança de módulo).
- `crm.service.ts` + `crm.controller.ts`: CRUD de expert + `/hub/crm/experts...` + `/hub/crm/clients/:id/
  experts` (listar) + POST/DELETE `/clients/:id/experts/:expertId` (vincular/desvincular). Roles espelham
  os de client.
- `prisma generate` rodado (local). Typecheck: meu código limpo; os 5 erros do `tsc` backend são baseline
  pré-existentes (wallet/media/emails/short-linking + `CLIENT_DETAIL_SELECT.deletedAt`). ⚠️ tsc do backend
  estoura heap — rodar com `NODE_OPTIONS=--max-old-space-size=6144`.
- ✅ **`prisma db push` rodado (2026-06-19)** — banco já estava em sync, tabelas `Expert`/`ClientExpert`
  confirmadas em produção. Nenhuma migração pendente.

### ✅ Fase 2 — Frontend COMPLETA (rodada 10b, 2026-06-19, Sonnet)
- `schema.ts`: `Carousel.expertId` opcional (nullable).
- `use-experts.hook.ts` (novo): `useExperts()` (todos os experts da org) + `useClientExperts(clientId)`
  (experts vinculados a UMA marca, SWR key null-safe). `use-crm-mutations.hook.ts` ganhou
  `createExpert/updateExpert/deleteExpert/linkExpert/unlinkExpert`.
- **Editor**: painel **"Expert"** (só quando `doc.crmClientId` existe) — `<select>` dos experts já
  vinculados à marca + atribui via `patchDoc({ expertId })`; criação rápida inline ("Nome" + "+ Criar")
  que cria o expert, vincula à marca automaticamente e já atribui ao carrossel.
- **`cedrico-briefing.ts`**: `buildBriefing`/`downloadBriefing` aceitam `expert?: BriefingExpert` — quando
  há expert atribuído, a seção "Experts" do DNA do Projeto vem preenchida de verdade (bio/tom/público/
  keywords/dna) em vez do placeholder genérico. Editor passa `selectedExpert` no botão "Exportar DNA".
- **Galeria** (`project-settings.component.tsx`): nova seção **"Experts vinculados a esta marca"** no
  modal de Configurações — lista TODOS os experts da org com toggle Vincular/Vinculado (N:N de verdade,
  um expert pode estar em várias marcas) + criação rápida com vínculo automático.
- Validado por `tsc --noEmit`. **Falta**: teste end-to-end no browser (db push já rodado).
- **Pendente (decisão de produto, não codado)**: tela dedicada de "gerenciar experts" (editar bio/tom/
  DNA depois de criado — hoje só dá pra criar com nome, editar exigiria UI própria, ex: reaproveitar/
  expandir o modal de config ou criar `expert-edit.component.tsx`). Avaliar quando Felipe usar na prática.

### 🔮 Próxima FASE (gatilho do Felipe, 2026-06-19)
Depois de fechar os ajustes do gerador: **Religare** ([[project-religare]]) + **corrigir o Kin do Dia**
([[project-hub-fixes-fim-fase]]). Felipe animado para isso — priorizar logo após o gerador.

## Próximos (pós-item 6)
- ~~**Mídia nos slides do CTA/capa** + contraste automático~~ ✅ (2026-06-19) — o grid de slots já cobria
  todos os slides; faltava o contraste: `setSlideBackgroundContrast` no hook reajusta o `fill` base dos
  textos ao trocar o tom (light → cor escura da marca; image/dark/grad → branco), preservando o
  word-accent dos runs. Usado no upload e no "Remover" do slot. Removido `onUploadMedia` órfão.
  (Obs: o parser ainda ignora `imageUrl` do GPT, que só manda texto — upload é manual.)
- ~~**Validação de limites de caractere** no painel~~ ✅ (2026-06-19) — `lintPairedText` em `autofill.ts`
  retorna `TextLengthWarning[]` (limites: capa 90 / subtítulo 130 / título 80 / corpo 380); painel
  Conteúdo (IA) mostra aviso âmbar "N textos podem transbordar" com slide+papel+contagem, ao vivo.
- **Super-humanos assíncronos** (via premium) — requisição→briefing→produção interna. Ver `[[project-agentes-backend-super-humanos]]`.
- **Sincronário** (Tzolkin no calendário) e **métricas reais** no dashboard Hub.

## Home / Galeria de carrosséis ✅ (construída — rodada 4, 2026-06-17)
Tela de entrada do gerador implementada em `/hub/volatis/carrosseis`.

**Arquivos principais:**
- `carousel-store.ts` — persistência multi-doc: `vocaccio:carousel:{id}` (docs), `vocaccio:carousel:index:{clientId|__none__}` (índice leve), `migrateLegacyDraft()` (migra doc 'draft' para UUID), CRUD completo (save/load/delete/duplicate/rename/setCover).
- `carousel-gallery.component.tsx` — galeria; abas Projetos (= clientes CRM); grid de cards; card com capa (coverDataUrl), badges (slides + ratio), título, timestamp relativo, Abrir / Duplicar / ⋮ (renomear+excluir upward).
- `use-carousel-doc.hook.ts` — refatorado p/ usar o store; id canônico = UUID; debounce atualiza índice.
- Editor: seta ← no toolbar → `/hub/volatis/carrosseis`; captura capa (slide 0 Konva toDataURL) após 1.2s e grava no índice via `setCover`.
- Cockpit: botão "Carrosséis" aponta para a galeria (antes era link direto para o editor).

**Decisões:**
- IDs: `crypto.randomUUID()` (com fallback). Docs legados ('draft') migrados automaticamente ao abrir a galeria.
- Capa: capturada pelo editor com debounce 1.2s após fontes prontas; placeholder aurora+sparkle se ainda não capturada.
- "Projetos" = clientes do CRM (useClientsAll); sem criar conceito novo.
- Aba "Todos" agrega todos os buckets via `listAllCarousels(clientIds)`.

**Próximo:** item 5 da ordem recomendada (Preview Instagram, desfazer/refazer, zoom, seletor de templates).

## Referências de conteúdo (não recriar)
`volatis-content/system-prompt-maquina-carrosseis-v4.md` (+ v5-delta), `-design-system.md`,
`-principios-design.md`, `-banco-de-headlines.md`, `-filtro-editorial.md`, `-manual-de-qualidade.md`;
`analise-completa-maquina-de-carrosseis.txt`, `analise-tecnica-maquina-de-carrosseis.md`.
