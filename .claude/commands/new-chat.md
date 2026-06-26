---
description: Encerra a sessão atual com handoff completo — atualiza memória, escreve/atualiza um doc de retomada no repo, gera o prompt de abertura do próximo chat, e recomenda modelo+esforço para o próximo passo.
---

Execute esta rotina de fechamento de sessão agora, nesta mesma resposta, sem perguntar se deve fazer — só pergunte se algo específico do handoff estiver genuinamente ambíguo (ex.: qual de duas frentes de trabalho paralelas é a prioritária para o próximo passo).

## 1. Identifique o que foi feito nesta sessão

Releia o que foi conversado/implementado nesta sessão (commits feitos, decisões tomadas, bugs encontrados, itens pendentes). Não assuma que é só sobre auditoria de segurança — pode ser Religare, Volatis, infraestrutura, UX, ou qualquer combinação. Identifique a(s) frente(s) de trabalho ativa(s).

## 2. Atualize a memória persistente relevante

Em `C:\Users\felip\.claude\projects\C--dev-vocaccio\memory\`, atualize (não recrie do zero) o(s) arquivo(s) de memória `project-*` mais relevantes à(s) frente(s) identificada(s) no passo 1, com:
- O que foi entregue nesta sessão (commits/decisões concretas, com hash quando houver).
- O que ficou pendente, bloqueado, ou aguardando validação do Felipe.
- Qualquer correção a uma afirmação anterior que se provou errada (marcar como "CORREÇÃO", não apagar o histórico).

Se nenhuma memória existente cobre o assunto, crie uma nova seguindo o formato de frontmatter já padronizado no projeto (`name`, `description`, `metadata.type`) e adicione uma linha no índice `MEMORY.md`.

## 3. Atualize o handoff em arquivo no repo

Memória pode ser perdida/resetada — o arquivo no repo é a fonte de verdade que sobrevive a isso. Atualize ou crie o doc de retomada mais apropriado:
- Se a sessão foi sobre a auditoria de segurança: `docs/auditoria/RETOMADA-fase*-<data>.md` (siga o padrão dos arquivos já existentes nessa pasta).
- Se foi sobre uma fase de produto (Religare, Volatis, etc.): `phases/checkpoint-<fase>.md` ou o handoff específico já referenciado na memória daquela fase (ex.: `docs/referencias/volatis-content/carrossel-status-e-roadmap.md`).
- Se não houver convenção clara para o assunto da sessão, pergunte ao Felipe onde prefere que esse handoff viva antes de criar um arquivo novo.

Comite esse arquivo (e só ele, ou junto de outros já pendentes de commit desta sessão) no branch atual — sem dar push.

## 4. Gere o prompt de abertura do próximo chat

Produza, na sua resposta final desta rotina, um bloco de texto pronto para copiar e colar como primeira mensagem do novo chat. Esse prompt deve:
- Ser direto, não uma recapitulação completa — só o essencial pra o novo chat começar produtivo.
- Dizer o que foi feito, o que falta, e qual é o próximo passo concreto.
- Referenciar os arquivos de memória e/ou handoff atualizados nos passos 2 e 3, para o próximo chat poder ler o resto se precisar.
- Incluir o branch git atual e confirmar que não houve push (lembrar a regra de nunca dar push sem pedido explícito).

## 5. Recomende modelo + esforço para o próximo passo

Seguindo a regra já estabelecida no projeto ([[feedback-model-recommendation]]): liste em tópicos separados e diretos o modelo + esforço recomendado para cada próxima tarefa identificada, reforçando tanto a nível de orquestração (Dumbledore) quanto do agente específico que executaria cada uma.

## Lembrete

Esta rotina formaliza em comando o que já estava registrado como hábito em [[feedback-rotina-novo-chat]] — mantenha esse arquivo de memória atualizado se o processo mudar.
