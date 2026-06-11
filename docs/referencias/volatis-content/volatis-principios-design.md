---
name: brandsdecoded-design
description: Princípios de design visual para carrosséis Instagram. Usar sempre que for renderizar HTML de carrossel, decidir layout, sugerir imagens, escolher tipografia, definir espaçamento ou avaliar qualidade visual de slides. Inclui regras de hierarquia visual, ritmo de leitura, uso de cor, quando usar card vs texto solto, quando sugerir imagem, e geração de paleta a partir de uma cor primária.
---

# BrandsDecoded Design System — Skill de Design Visual

Consultar esta skill ANTES de renderizar qualquer carrossel HTML. Ela define os princípios visuais que fazem um carrossel parecer profissional e não genérico.

---

## 1. HIERARQUIA VISUAL — Regra dos 3 Níveis

Todo slide tem exatamente 3 níveis de leitura. Nunca mais, nunca menos.

| Nível | O que é | Peso visual | Exemplo |
|---|---|---|---|
| **1 — Âncora** | O elemento que o olho vê primeiro | Maior: headline condensada, número grande, imagem | `TEMA ABERTO. ÂNGULO SEU.` em 80px |
| **2 — Contexto** | O que explica a âncora | Médio: body text, 38px | Parágrafo explicativo |
| **3 — Metadata** | O que organiza sem competir | Menor: tag, brand bar, progress | `O FENÔMENO` em 13px |

**Regra:** Se um slide tem 2 elementos com o mesmo peso visual, um deles precisa mudar. Dois parágrafos do mesmo tamanho = hierarquia quebrada.

**Aplicação prática:**
- Slides com headline: headline = nível 1, body = nível 2, tag = nível 3
- Slides sem headline: body com `<strong>` no início = nível 1, resto do texto = nível 2, tag = nível 3
- Slides com tabela: header da tabela = nível 1, dados = nível 2, fonte = nível 3
- Slides com número grande (`.dark-big-stat`): número = nível 1, label = nível 2, tag = nível 3

---

## 2. RITMO VISUAL — Alternância Dark/Light

O template Alternado Claro/Escuro não é só estético — é funcional:

- **Dark slides** = tensão, revelação, mecanismo. Tom mais sério.
- **Light slides** = dados, prova, aplicação prática. Tom mais acessível.
- **Gradient slide** = direção, chamada à ação implícita. Tom de urgência.

**Regra de quebra:** nunca 3 slides consecutivos do mesmo tipo (dark-dark-dark ou light-light-light). A alternância mantém o scroll.

**Regra de densidade:** slides dark aguentam menos texto que slides light (fundo escuro cansa mais rápido). Max ~80 palavras em dark, ~100 palavras em light.

---

## 3. ESPAÇAMENTO — Regra do Terço Inferior

O conteúdo textual ocupa o **terço inferior e médio** do slide (flex-end). O terço superior fica como "respiro visual" — ele não é espaço desperdiçado, é espaço que dá peso ao conteúdo embaixo.

**Exceções onde o topo é preenchido:**
- Slide com `.img-box` no topo (imagem retangular)
- Slide com `.dark-big-stat` (número gigante no centro-topo)
- Slide de capa (imagem full-bleed)
- Slide com headline interna grande (80px+ preenche naturalmente)

**Se o slide parece "vazio" mesmo com flex-end:**
1. Primeiro: aumentar o font-size do body ou da headline
2. Segundo: adicionar um card (`.dark-card` ou `.light-card`) pro texto
3. Terceiro: sugerir um `.img-box` ao usuário
4. Último recurso: adicionar mais conteúdo ao slide (com aprovação do usuário)

---

## 4. TIPOGRAFIA — Escala e Contraste

### Escala fixa (1080×1350px nativos)

| Elemento | Tamanho | Peso | Uso |
|---|---|---|---|
| Headline capa | 88–108px | 900 | Capa do carrossel |
| Headline interna (dark) | 72–80px | 900 | Slides dark com título |
| Headline interna (light) | 64–72px | 900 | Slides light com título |
| Headline grad | 72–80px | 900 | Slide gradient |
| Body | 36–40px | 400 | Texto corrido |
| Body strong | 36–40px | 700–800 | Destaques dentro do body |
| Tag | 13px | 700 | Labels de seção |
| Brand bar | 17px | 700 | Topo de cada slide |
| Progress | 15px | 600 | Rodapé |

### Contraste tipográfico
- **Headline** sempre em fonte condensada (Barlow Condensed), uppercase, letter-spacing negativo
- **Body** sempre em fonte regular (Plus Jakarta Sans), sentence case, letter-spacing neutro
- Nunca usar a mesma fonte/peso/tamanho pra dois elementos diferentes

### Cor do texto
- Dark slides: body em `rgba(255,255,255,0.55)`, strong em `#fff`, accent em `var(--PL)`
- Light slides: body em `rgba(15,13,12,0.60)`, strong em `var(--DB)`, accent em `var(--P)`
- Accent (cor primária) apenas em **palavras-chave**, nunca em frases inteiras

---

## 5. COMPONENTES VISUAIS — Quando Usar Cada Um

### Card (`.dark-card` / `.light-card`)
**Usar quando:** o texto precisa de destaque extra, citação, ou é uma lista de 2-3 itens dentro de um slide.
**Não usar quando:** o slide já tem headline + body (card vira ruído).

### Tabela (`.light-table`)
**Usar quando:** slide de dados com 3+ itens comparáveis (indicador + valor).
**Não usar quando:** slide com menos de 3 dados (fica desproporcional).

### Big Stat (`.dark-big-stat`)
**Usar quando:** um único número é o protagonista do slide (ex: "2.300%").
**Não usar quando:** o slide tem múltiplos dados de peso igual.

### Image Box (`.img-box`)
**Usar quando:** slide tem <60% de preenchimento textual E o usuário tem imagem disponível.
**Não usar quando:** slide já está denso ou imagem não adiciona informação.

### Arrow Rows (`.dark-arrow-row` / `.grad-row`)
**Usar quando:** slide lista 2-3 pontos sequenciais (não paralelos).
**Não usar quando:** mais de 4 itens (vira lista, perde impacto).

---

## 6. COR — Geração de Paleta

A partir de uma única cor primária, derivar todo o sistema:

```
BRAND_PRIMARY = cor informada pelo usuário
BRAND_LIGHT  = primary clareado ~20% (mix com branco)
BRAND_DARK   = primary escurecido ~30% (mix com preto)
LIGHT_BG     = off-white com temperatura do primary
                warm primary (vermelho, laranja, amarelo) → #F5F2EF ou #F7F4F1
                cool primary (azul, verde, roxo) → #F0F2F5 ou #ECEEF2
DARK_BG      = near-black com leve tint
                warm → #0F0D0C ou #120E0B
                cool → #0C0D10 ou #0B0E14
LIGHT_BORDER = LIGHT_BG escurecido 5%
GRADIENT     = linear-gradient(165deg, BRAND_DARK 0%, BRAND_PRIMARY 50%, BRAND_LIGHT 100%)
```

**Regra de contraste:** a cor primária NUNCA aparece como fundo de texto. Sempre como accent em palavras-chave, borda de card, fill de progress bar, ou em headlines da capa.

---

## 7. IMAGENS — Princípios de Uso

### Capa (obrigatória se disponível)
- Imagem full-bleed com gradiente escuro pesado na base
- Sujeito da foto preferencialmente no terço superior
- Gradiente garante contraste 4.5:1 com headline branca

### Imagem de fundo em slide interno (overlay)
- Apenas em slides dark
- Overlay mínimo 70% opacity
- Texto precisa de contraste 4.5:1 mesmo com a imagem mais clara possível
- Usar quando a imagem adiciona contexto ao conteúdo (não decoração)

### Image Box (`.img-box`)
- Retângulo com border-radius 20px no topo do conteúdo
- Altura fixa: 360px (ajustar se necessário)
- `object-fit: cover` — nunca distorcer
- Sugerir ao usuário apenas quando o slide tem espaço sobrando

---

## 8. CHECKLIST VISUAL — Rodar Antes de Renderizar

Para CADA slide do carrossel, verificar:

1. ✅ Hierarquia de 3 níveis clara (âncora, contexto, metadata)
2. ✅ Contraste texto/fundo ≥ 4.5:1
3. ✅ Accent color apenas em palavras-chave, não em frases
4. ✅ Safe area respeitada (56px horizontal, 80px bottom)
5. ✅ Nenhum elemento sobrepõe progress bar ou brand bar
6. ✅ Headline não ultrapassa 4 linhas no tamanho definido
7. ✅ Alternância dark/light respeitada (nunca 3 seguidos do mesmo)
8. ✅ Componente visual correto pro conteúdo (card, tabela, stat, img-box)
9. ✅ Sem swipe arrow (removido — swipe é nativo do Instagram)
10. ✅ CTA tem frase-ponte conectando conteúdo ao call-to-action

---

## 9. ANTI-PATTERNS VISUAIS — Nunca Fazer

- ❌ Texto centralizado em slides de conteúdo (só CTA pode ter elementos centralizados)
- ❌ Dois parágrafos do mesmo tamanho/peso sem diferenciação
- ❌ Imagem sem overlay suficiente comprometendo legibilidade
- ❌ Cor accent em mais de 3 palavras por slide
- ❌ Card dentro de card
- ❌ Tabela com menos de 3 linhas
- ❌ Headline em sentence case (sempre uppercase em condensada)
- ❌ Body text em uppercase (nunca)
- ❌ Mais de 100 palavras em um slide dark
- ❌ Slide com apenas tag + 1 frase curta (parece incompleto — expandir ou fundir com outro)
