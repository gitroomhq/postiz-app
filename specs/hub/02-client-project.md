# Spec — Cadastro Global de Cliente e Projeto (Fase 1)
> Fonte: PLANO-MESTRE.md Camada 4. Entidade central consultada pelos 3 sistemas e todos os agentes.

## Formulário de Projeto (`/hub/crm/projetos/[id]`)

Seções do form (campos mapeados 1:1 com o modelo `Project` em database-schema.md):

### 1. Identidade
- Nome do projeto · Cliente vinculado (select) · Owner do projeto (select de User)
- Logo (upload → Supabase Storage → `Media` → `logoMediaId`)
- Área de atuação · Slogan

### 2. Marca
- Cores: 1 primária + até 4 secundárias (color picker → `colors` Json)
- Tipografia: heading + body (select das 30 fontes @fontsource → `typography` Json)

### 3. Presença digital
- Redes sociais + @s (lista dinâmica → `socialHandles` Json: instagram, tiktok,
  linkedin, youtube, facebook, x, pinterest, threads)
- Site · Bio link

### 4. Estratégia
- Produtos/Serviços (textarea)
- Persona: nome + dores (lista) + desejos (lista) → `persona` Json
- Tom de linguagem (select: FORMAL, CASUAL, INSPIRATIONAL, TECHNICAL, PLAYFUL, AUTHORITATIVE)
- CTA 1, CTA 2, CTA 3
- Briefing livre (textarea longa)

### 5. Configuração
- Localidade + fuso horário (defaults pt-BR / America/Sao_Paulo)
- Análise vocacional vinculada: select desabilitado com nota "Religare — Fase 5"
  (campo `vocationalProfileId` já existe no schema)
- Status (ACTIVE / PAUSED / ARCHIVED)

## Regras
- Nome + cliente + owner são obrigatórios; o resto é progressivo (form salva parcial)
- Autosave com debounce 2s OU botão salvar explícito por seção — decidir na implementação
- Qualquer update dispara invalidação do Context Pack (na F1 só limpa
  `contextPackCache`; geração real do pack é Fase 4)
- Upload de logo: aceitar PNG/JPG/SVG/WebP, máx 5MB

## Consumo pelos agentes (referência futura)
Todo agente recebe o Context Pack do projeto antes de qualquer geração (Camada 4/5).
Na Fase 1 basta o dado estar estruturado e completo no banco — o gerador de pack
entra na Fase 4.

## Critérios de aceite
- [ ] Form completo cria/edita Project com todos os campos da Camada 4
- [ ] Upload de logo funcional via Supabase Storage
- [ ] Campos Json (colors, persona, socialHandles, typography) validados com zod
- [ ] Projeto dummy do seed abre e edita sem erro
