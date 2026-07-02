---
name: atelie
description: Use when operating the Vocaccio Ateliê Virtual back-office (AT-1, manual mode) — producing a robust client deliverable (site, landing page, plano de comunicação/marketing/growth, funil de automação, roteiro/script, tutorial, análise de redes/concorrência) from a filled briefing in docs/atelie/briefings/, enriched with the client's Context Pack and Religare profile, and validated for brand adherence before handoff. Not for front-office features (carrossel, agendamento, copy curta) — those already exist in Volatis/Augeo.
version: 0.1.0
user-invocable: true
argument-hint: "[serviço] [cliente]"
---

Produz um entregável do Ateliê Virtual (back-office) para um cliente/projeto real do CRM
Vocaccio, seguindo o contrato descrito em `docs/atelie/plano-atelie-virtual.md` — mas sem
depender da tabela `ServiceRequest` (isso é AT-2). Nesta fase (AT-1) o pedido e a entrega
são arquivos versionados, e você (o operador — Felipe/Nicolas/agência) aciona a skill
diretamente.

## Passo a passo

1. **Identificar serviço e cliente.** O serviço deve ter um template em
   `docs/atelie/briefings/<slug>.md` (ver tabela abaixo). Se o serviço pedido não tiver
   template, pare e avise — não improvise um briefing novo sem que o operador decida a
   taxonomia (isso é decisão de produto, ver AT-0).

   | Slug | Serviço | Skill/agente de apoio |
   |---|---|---|
   | `site-institucional` | Site institucional | Next.js + DS Vocaccio nativo |
   | `landing-page` | Landing page | idem + skill `impeccable` |
   | `plano-comunicacao-marketing` | Plano de comunicação/marketing | skill `docx`/`pdf` |
   | `plano-growth-negocios` | Plano de growth/negócios | idem |
   | `funil-automacao` | Funil de automação (roteiro) | skill `docx` |
   | `roteiro-script` | Roteiro/script de conteúdo | skill `docx` |
   | `tutorial-documentacao` | Tutorial/documentação | skill `docx`/`pptx` |
   | `analise-redes-concorrencia` | Análise de redes/site/concorrência | FireCrawl MCP se disponível; senão, WebFetch/pesquisa manual |

   Vídeo e carrossel/copy **não têm template aqui** — vídeo é do Nicolas (fora de escopo),
   carrossel/copy já são front-office (Volatis/Augeo), não back-office.

2. **Criar a instância do pedido.** Copie `docs/atelie/briefings/<slug>.md` para
   `docs/atelie/pedidos/<cliente-slug>/<slug>-<AAAA-MM-DD>.md` e preencha com o operador
   (ou peça pra ele preencher). Nunca edite o template original em `briefings/`.

3. **Reunir o Context Pack do cliente.** Busque no schema Prisma (`Client`/`Project` em
   `libraries/nestjs-libraries/src/database/prisma/schema.prisma`) ou peça ao operador:
   nome, área de atuação, redes/@s, cores, tipografia, persona, tom de voz, CTAs, briefing
   livre. Se o cliente tiver perfil Religare (PDF 1 ou 2, ver Camada 10.2 do
   `PLANO-MESTRE.md`), peça o PDF anexado ou o link do perfil — ele é o filtro de
   autenticidade, não é opcional pular esta etapa quando o perfil existir.

4. **Produzir o entregável** usando a skill/agente de apoio da tabela acima. Sempre no tom
   de voz e restrições de marca do Context Pack — nunca genérico.

5. **Checklist de aderência à marca (validação "Hagrid", manual nesta fase):**
   - [ ] Tom de voz bate com o `Client.tone`/persona informados
   - [ ] Cores/tipografia usadas são as do Context Pack (quando aplicável ao formato)
   - [ ] CTAs alinhados aos CTAs cadastrados do projeto
   - [ ] Nenhuma promessa de "viralização fácil" ou growth vazio (ver tom de voz do
     BUSINESS-PLAN — "evitar" §7)
   - [ ] Se houver perfil Religare, a síntese vocacional foi respeitada no direcionamento

6. **Salvar a entrega.** Escreva o arquivo final em
   `docs/atelie/entregas/<cliente-slug>/<slug>-<AAAA-MM-DD>.<ext>`. Nesta fase (AT-1) não
   há upload automático pro Supabase Storage nem portal de aprovação — o operador decide
   como entregar (anexar, subir manualmente, etc.). Isso muda na AT-2.

7. **Reportar ao operador**: nome do arquivo gerado, checklist marcado, e qualquer ponto do
   briefing que ficou sem resposta (não adivinhar informação de marca ausente).

## Regras gerais (herdadas do CLAUDE.md do projeto)

- Nenhuma dependência nova de npm para produzir entregáveis — reusar skills já instaladas
  (`docx`, `pdf`, `pptx`, `impeccable`, `canvas-design`) e o próprio DS Vocaccio.
- Sem gambiarra de infraestrutura: esta skill não cria tabela, endpoint ou serviço novo —
  é só arquivos + skills existentes até a AT-2 justificar a fila real.
- Se o pedido exigir decisão de arquitetura (ex.: schema novo, integração nova), pare e
  escale para `mcgonagall-planner` em vez de decidir sozinho dentro desta skill.
