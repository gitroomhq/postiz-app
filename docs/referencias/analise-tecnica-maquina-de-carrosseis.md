# Análise Técnica Profunda — Máquina de Carrosséis | Brands Decoded

## 🧱 Stack Tecnológico

### Frontend Framework
**React 18** — confirmado via `__reactContainer$` e `_reactListening` no DOM root (`#root`). O Sentry reporta `sentry.javascript.react/10.48.0`, o que revela a versão do SDK e confirma o framework.

### Build Tool
**Vite** — evidenciado pelo bundle único com hash de conteúdo no nome (`/assets/index-B5FT_vx0.js`), padrão característico do Vite. Não há múltiplos chunks de route splitting, sugerindo build otimizado em bundle único.

### Roteamento
**Hash-based routing** (`/#/studio/...`, `/#/start`) — provavelmente React Router ou uma solução própria leve. Não usa History API com paths limpos, optando pela compatibilidade máxima de hosting estático.

### Renderização Canvas
**Konva.js v10.2.0** — a escolha central da aplicação. É uma biblioteca 2D Canvas wrapper sobre a Canvas API nativa. No studio, há **9 Konva Stages** rodando simultaneamente:
- 1 stage principal de edição: `1080 × 1350px` (proporção 4:5 do Instagram)
- 8 stages menores de `221 × 276px` (thumbnails dos slides no painel lateral)

A estrutura de cada Stage Konva segue 3 layers:
1. **Layer de fundo** — `Rect` com fill (cor de background do slide)
2. **Layer de mídia** — `Image` (foto/vídeo do slide)
3. **Layer de conteúdo** — `Text` nodes com propriedades completas (fontFamily, fontSize, fill, lineHeight, letterSpacing, draggable: true)

### Backend & Banco de Dados
**Firebase Firestore** — confirmado por 11 chaves de localStorage com prefixo `firestore_*` e requisições de rede constantes para `firestore.googleapis.com`. O projeto Firebase se chama `autopost-85308`. O padrão de uso é **Realtime Sync** via long-polling (canal Listen/channel), o que mantém o carrossel sempre sincronizado.

### Autenticação
**Google Sign-In (GSI)** — via `https://accounts.google.com/gsi/client`. Sem formulário de login/senha, apenas OAuth Google.

### Analytics & Monitoramento
**Google Analytics 4** (GA4 — `G-926VJPT49D`) e **Sentry** para rastreamento de erros em produção.

### CSS / Design System
**Tailwind CSS v4** (arbitrário) — todas as classes usam a sintaxe moderna com valores arbitrários (`bg-[#070707]`, `text-[#ff3d00]`, `h-[100dvh]`). Uso extensivo de `dvh` (dynamic viewport height) para mobile.

### Fontes Carregadas
Sistema de design rico com fontes customizadas e variáveis:
- **Super Sans VF** (Variable Font) — pesos 200–900, fonte proprietária da Brands Decoded
- **Super Serif VF** — família serifada variável
- **Super Mono VF** — família mono variável
- **Inter** (variável, da Google Fonts) — interface geral
- **Bebas Neue** — peso 400, provavelmente para CTAs

### Armazenamento Local
**localStorage** com chave `autopost:*` para estado persistente local (carousel ID, template selecionado, configurações de brand). Fallback offline robusto. **IndexedDB** presente (usado pelo Firebase SDK).

### Service Worker
**Registrado** — mas sem manifest PWA formal. Provavelmente para cache de assets e suporte offline básico.

---

## 🧩 Arquitetura da Aplicação

O sistema opera como um **SPA (Single Page App)** com arquitetura em 3 camadas:

```
[Firebase Firestore] ←→ [React State] ←→ [Konva Canvas]
      (dados)              (lógica)         (renderização)
```

Os dados do carrossel são salvos no Firestore em tempo real. O React gerencia o estado e sincroniza mudanças. O Konva renderiza visualmente no canvas com alta fidelidade, replicando exatamente o que será exportado.

---

## 🎨 Interface & UI

### Layout Geral — 3 colunas clássicas de editor
```
[Sidebar esquerda] | [Canvas Central] | [Sidebar direita]
    ~300px              fill              ~250px
```

**Sidebar Esquerda** contém painéis colapsáveis em accordion:
- Template selector (dropdown)
- Criador de Conteúdo (autofill via IA)
- Campos Globais (brand-name, avatar, copyright)
- Texto (edição quando elemento selecionado)
- Mídia (upload de imagens/vídeos)
- Fundo (cores por slide)
- CTAs
- Proporção de exportação (4:5 / 9:16)
- Histórico (lista de saves com Restaurar)

**Canvas Central** exibe o slide ativo em alta fidelidade, com zoom controlável (`-` / `+` e percentual) e indicador visual "Visualização de Alta Fidelidade".

**Sidebar Direita** é um film strip vertical com thumbnails de todos os slides (renderizados como Konva stages menores), clicáveis para navegação rápida.

**Header** com breadcrumb navegável: `Projetos → Nome do Projeto → Carrossel → Nome do Carrossel`, com botão de edição inline do título.

---

## ✨ Funcionalidades Mapeadas

### Edição Visual (Canvas)
- **Click para selecionar** elementos de texto no canvas
- **Drag & drop** — textos são draggable (`draggable: true` no Konva)
- **Edição de estilo por palavra** — o painel de Texto permite selecionar e estilizar palavras individualmente (há botões por palavra: "Foi", "desse", "incômodo"...), criando highlight/estilo word-by-word
- **Bold (B), Italic (I)** com botões na toolbar
- **Alinhamento** (4 opções de alinhamento)
- **Tamanho da fonte** com slider, input numérico e botões ±
- **Letter spacing, line height** via sliders de range
- **Cor do texto** via color picker nativo + input RGBA
- **"Limpar estilos"** por seleção ou tudo

### Gestão de Conteúdo (Autofill com IA)
- Área de texto livre para colar conteúdo em formato lista (`- Texto linha 1`)
- Botão **"Aplicar Texto"** que distribui automaticamente o texto pelos slides do template
- Links para **ChatGPT Agents customizados** (Content Machine e Headlines Virais) que geram o conteúdo — integração via GPT Agents externos

### Campos Globais (Brand Variables)
- `brand-name`, `brand-name-2`, `copyright`, `avatar` — variáveis que se propagam por todos os slides automaticamente
- Upload de avatar com checkbox "Usar como padrão em novos carrosséis"
- Cada campo tem toggle de visibilidade (mostrar/esconder)

### Mídia
- Upload de PNG, JPG, WebP e **MP4**
- Sistema de **slots numerados** (ex.: "5 de 9 slots preenchidos")
- **Drag-to-reorder** (segure para trocar posição dos slots)
- Clique para substituir imagem em slot
- Botão "Limpar" e "Remover" por slot
- Checkbox "Substituir slots preenchidos"

### Fundo dos Slides
- Color picker individual por slide (até 10 slides)
- Input de cor com suporte a RGBA e hex
- Opção de salvar como padrão para novos carrosséis

### Exportação (múltiplos formatos)
- **Exportar tudo** — PNG de todos os slides
- **Exportar slide N** — PNG individual
- **Exportar .zip** — todos os slides em arquivo compactado
- **PDF (LinkedIn)** — formato otimizado para LinkedIn
- **Exportar Vídeo (MP4)** — geração de vídeo diretamente no browser

### Preview Instagram
Modal com mock de smartphone exibindo o carrossel como se fosse um post real do Instagram, com avatar, nome de usuário, ícone de verificado, botões de interação (like, comentar, compartilhar, salvar) e indicadores de slides (dots). Navegação por setas.

### Histórico de Versões
Lista de saves com timestamp ("há 23 dias") e botão **Restaurar** por versão — sistema de undo com persistência no Firestore.

### Gestão de Projetos (Start Screen)
- Projetos como containers (ex.: "Vocaccio | Marketing")
- Múltiplos carrosséis por projeto
- Thumbnail gerado automaticamente via Canvas
- Ações: Abrir, Duplicar, e menu adicional (...)
- Criação de novos projetos e carrosséis via CTA

---

## 🧠 UX & Design

### Filosofia de UX
A ferramenta aposta em **redução radical de fricção** para criadores de conteúdo. Em vez de um editor genérico (estilo Canva), é uma ferramenta especializada e opinionada: templates fechados + autofill de texto = resultado profissional com zero design skill.

### Padrões UX Notáveis
**Word-level styling** é o diferencial de UX mais sofisticado — ao invés de selecionar parágrafos, o usuário seleciona palavras individuais para aplicar estilo, o que é exatamente o que conteúdo de alto impacto no Instagram requer (highlight em palavras-chave).

**Autofill** resolve o problema da tela em branco — o criador cola o texto e o sistema distribui nos slides. Isso reduz o tempo de criação de horas para minutos.

**Preview in-context** (mock Instagram) resolve a dúvida "como vai ficar?" sem precisar exportar e subir no Instagram manualmente.

**Histórico persistente** dá segurança para experimentar sem medo de perder trabalho.

### Paleta de Cores da Interface
- Background geral: `#070707` (quase preto)
- Header/sidebar: `#0a0a0a`
- Accent principal: `#ff3d00` (laranja-vermelho vibrante)
- Hover accent: `#ff5020`
- Texto: branco puro + `neutral-400` para secundário
- Bordas: `white/5` e `white/10` (branco com baixa opacidade)

### Tipografia da Interface
Inter (variável) para todos os textos de UI. Bebas Neue para CTAs maiores. As fontes Super Sans/Serif/Mono são exclusivamente para os slides gerados.

---

## 💡 Insights para o Novo Projeto

Considerando tudo que foi mapeado, os pontos mais valiosos para replicar e evoluir são:

**Motor de Renderização:** Konva.js é a escolha certa para este tipo de editor canvas. Permite layers separadas (fundo, mídia, texto), eventos (click, drag), serialização para JSON (`.toJSON()`) e exportação via `toDataURL()` ou `toBlob()`. A arquitetura de 1 stage principal + N thumbnails é elegante.

**Dados como JSON no Firestore:** Cada slide é um objeto JSON descrevendo os Nodes Konva. Isso permite versionamento, template system (um JSON é um template), e sincronização em tempo real trivial.

**Autofill baseado em posição:** O sistema mapeia "texto linha 1 → slide 1, texto linha 2 → slide 2". A chave é o template ter slots nomeados que o autofill resolve. Simples e poderoso.

**Exportação de vídeo no browser:** Provavelmente usa `MediaRecorder API` ou `canvas.captureStream()` + `requestAnimationFrame` para gerar MP4 sem servidor. Vale investigar bibliotecas como `RecordRTC` ou implementação própria.

**Thumbnails em tempo real:** Renderizar N Konva stages menores sincronizados com o principal é custoso mas visualmente muito superior a screenshots estáticos. A alternativa seria usar `canvas.toDataURL()` do stage principal e redimensionar via CSS.

**Campos Globais como variáveis de template:** Brand variables propagadas para todos os slides via estado compartilhado. No Konva, os Text nodes que usam essas variáveis simplesmente observam o estado React e re-renderizam. É um data binding entre React state e Konva nodes.

**Hash Routing para URLs compartilháveis:** `/#/studio/{id}/{slideIndex}` permite que a URL encode qual slide está sendo editado, facilitando colaboração e deep linking.