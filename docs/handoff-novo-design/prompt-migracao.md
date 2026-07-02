# Guia de Migração e Prompt: Novo System Design Vocaccio

Para garantir que a implementação do novo design no ecossistema real (código de produção) ocorra de forma tranquila, criei este documento que "empacota" tudo o que construímos. Você pode usá-lo como um roteiro para a próxima sessão de IA (seja nesta IDE ou em outra ferramenta como Cursor/Windsurf).

## 🚀 Passo a Passo da Integração

Se a IA for executar o trabalho, ela seguirá logicamente esta ordem:

1. **Tokens (CSS/SCSS):** O primeiro passo deve ser sempre substituir os hexadecimais espalhados e as variáveis do Postiz (`--new-*`) pelas novas variáveis base `--voc-*` do "Caminho do Meio". Sem quebrar o código antigo, a IA fará um mapeamento (ex: `--new-btn-primary` passa a chamar `var(--voc-violet)`).
2. **Tailwind Config:** Ajustar as tipografias base (substituindo o padrão do Tailwind por `Manrope`) e integrar os utilitários de sombreamento Glass e gradientes Aurora diretamente no arquivo de configuração do Tailwind.
3. **Injeção do Background Orgânico:** Adicionar o componente das Auras (Ambient Glows) no arquivo principal da arquitetura do frontend (ex: `layout.tsx`, `App.vue` ou index principal).
4. **Refatoração B2B dos Cards:** Passar pelos componentes compartilhados (Shared Components) de interface (painéis de configuração, CRM, listagens) aplicando a nova diagramação B2B (borders suaves, sub-cards e encapsulamento de ícones).
5. **Tratamento Específico de LPs:** Inserir o Orbital Effect de forma isolada *apenas* em seções de Hero (Headers) nas Landing Pages que usarem fundo escuro.

---

## 🤖 O Prompt de Execução (Handoff)

**Copie o bloco abaixo na íntegra** e cole na sua próxima sessão de desenvolvimento de código. O texto já carrega todo o contexto e direcionamentos que a IA precisa para agir sobre o seu repositório Vocaccio.

> **Contexto:** Nós já validamos um novo System Design unificado para a Vocaccio (abordagem SaaS Premium B2B + Aura Mágica), abandonando a fragmentação visual causada pela integração com o Postiz e os tons opacos antigos. As novas diretrizes estão completamente documentadas no arquivo `system-design-unificado-2026-06.md`.
>
> **Objetivo:** Refatorar a base do Front-End (Estilos Globais, Tailwind e Layout Base) para injetar esse novo System Design sem quebrar as funcionalidades do sistema atual.
> 
> **Plano de Execução (Siga esta ordem):**
> 1. **Variáveis e CSS Root:** Abra o arquivo principal de estilos globais do repositório (ex: `globals.css` ou `colors.scss`). Apague tons antigos e inclua as exatas cores "Caminho do Meio": `--voc-peach: #F29676`, `--voc-rose: #DF548E`, `--voc-violet: #7C5EE1`, `--voc-blue: #23A6D6`. Mapeie as variáveis legadas do Postiz (ex: `--new-btn-primary`) para referenciar esses novos tokens oficiais, injetando contraste e saturação de forma automática no legado.
> 2. **Tailwind Config:** Atualize a configuração do `tailwind.config` para definir a fonte `Manrope` como a sans-serif principal do sistema. Inclua extensões para o Box Shadow e o Background (referenciando os gradientes `--voc-aurora` e as sombras de Glassmorphism do System Design).
> 3. **Background Dinâmico (Ambient Glows):** Localize o layout raiz do painel/plataforma. Adicione a camada inferior fixa (`inset: -10vw`) contendo 3 bolhas de gradiente radial (`radial-gradient`) que se movem de forma muito sutil via animação de `translate` css, para que a interface interna tenha a "Aura Mágica" orgânica da Vocaccio. (Referência no arquivo `.md`).
> 4. **Glassmorphism:** Identifique o componente base de `Card` do sistema e atualize-o para o novo padrão B2B: fundo semi-translúcido (com `backdrop-filter: blur(48px)`), `border` extremamente sutil (0.08 opacidade) e o sombreamento glass.
> 5. **(Opcional) Orbital Effect:** Para arquivos de Landing Page (`LP`), prepare um componente/CSS do Efeito Orbital que foi resgatado, garantindo que ele tenha `display: none` em Light Mode e que NUNCA seja renderizado nas áreas internas de SaaS do sistema para não pesar a leitura.
>
> **Restrição Crítica:**
> Siga rigorosamente o documento `system-design-unificado-2026-06.md` recém atualizado para os valores hexadecimais, espaçamentos e raios. Não altere o comportamento do javascript, mude apenas folhas de estilo, temas e marcações no DOM base. Inicie pelo `Tailwind` e CSS Global e peça minha aprovação no diff.
