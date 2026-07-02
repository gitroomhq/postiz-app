# Aprimoramento do Religare em fases

A decisão de separar o projeto em duas fases é a mais estratégica.

A **Fase 1** deve nascer como uma ferramenta de **captação, organização, decodificação manual e geração do Grimório**.
A **Fase 2** (em diante) deve substituir progressivamente os processos manuais por cálculos próprios, bases interpretativas internas e automações.

Considere que já temos uma parte do Religare construída em C:\dev\vocaccio e que vamos aprimorar a partir desta base. Primeiramente em um módulo "avulso" porém sempre integrável ao ecossistema completo da Vocaccio. Aguarde minha instrução explícita para fazermos a integração ao ecossistema.

O ponto-chave: a Fase 1 não deve ser provisória ou descartável. Ela deve criar o **molde operacional definitivo** do Religare. Depois, na Fase 2, os cálculos internos apenas passam a preencher automaticamente os mesmos campos que hoje você preenche manualmente.

Os anexos deixam claro que o produto atual não é apenas “um mapa”, mas um processo de integração: astrologia, Human Design, Tzolkin, Eneagrama, arquétipo e rito simbólico viram uma narrativa única no Grimório. O Grimório de Bárbara, por exemplo, já estrutura a leitura em camadas como “Arquitetura do seu Ser”, “Bússola da Alma”, “Motor Energético”, “Escudo Social”, “Frequência Corporal”, “Grande Integração”, “Tabuleiro da Alma”, “Ativação Arquetípica” e “Rito de Assunção”. 

Os três documentos do Google Drive não ficaram acessíveis pelo conector disponível nesta sessão. Recomendo exportá-los como PDF ou DOCX e anexar ao projeto, porque eles devem virar a primeira base real de padrões interpretativos do Religare.

---

# Fase 1: Religare Questionário + Decodificação Manual

## Objetivo da Fase 1

Criar uma ferramenta web que:

1. Coleta dados completos da pessoa.
2. Organiza um questionário profundo e dinâmico.
3. Gera uma ficha estruturada para você consultar ferramentas externas.
4. Permite colar, anexar e classificar resultados manuais.
5. Apoia a síntese integrativa.
6. Monta o Grimório final em formato editável.
7. Exporta PDF e Context Pack.

A Fase 1 deve funcionar como um **Ateliê de Decodificação Cosmológica**.

---

# Produto da Fase 1

## Nome operacional

**Religare Studio**

## Promessa interna

> Transformar respostas, mapas e fragmentos simbólicos em um Grimório Cosmológico integrado.

## Usuários da Fase 1

| Usuário                    | O que faz                                                                   |
| -------------------------- | --------------------------------------------------------------------------- |
| Cliente final              | Preenche questionário e dados de nascimento                                 |
| Felipe / Vocaccio          | Consulta ferramentas externas, cola resultados, faz síntese e gera Grimório |
| Terapeuta ou mentor futuro | Usa o questionário para clientes próprios                                   |
| Agência futura             | Usa o mapa como briefing de marca, conteúdo e posicionamento                |

---

# Fluxo ideal da Fase 1

## 1. Criar perfil Religare

Campos principais:

| Campo                       | Uso                                                          |
| --------------------------- | ------------------------------------------------------------ |
| Nome completo de nascimento | Numerologia, identidade civil e registro                     |
| Nome de uso                 | Tratamento no Grimório                                       |
| Data de nascimento          | Astrologia, Tzolkin, Human Design, numerologia               |
| Hora de nascimento          | Astrologia e Human Design                                    |
| Precisão da hora            | Alta, aproximada, desconhecida                               |
| Cidade, estado e país       | Astrologia e Human Design                                    |
| Objetivo do mapa            | Autoconhecimento, vocação, marca, conteúdo, terapia, negócio |
| Permissão de uso interno    | Cases, anonimização, base interpretativa futura              |

## 2. Questionário Religare

O questionário deve gerar respostas para áreas que os dados de nascimento não entregam.

| Bloco              | Função                                                       |
| ------------------ | ------------------------------------------------------------ |
| Momento de vida    | Entender busca atual, transição, dor e urgência              |
| História simbólica | Mapear eventos marcantes e padrões repetidos                 |
| Vocação            | Identificar dons, talentos, prazer, contribuição e sustento  |
| Sombra             | Ver defesas, medos, sabotagens, raiva, culpa, controle, fuga |
| Corpo e energia    | Rotina, sono, vitalidade, instinto, ambiente, sensibilidade  |
| Relações           | Vínculos, pertencimento, limites, padrões afetivos           |
| Expressão          | Voz, escrita, imagem, criatividade, comunicação              |
| Espiritualidade    | Relação com fé, rito, símbolos, mistério e sentido           |
| Marca e conteúdo   | Somente quando objetivo incluir negócio ou comunicação       |
| Anamnese livre     | Espaço para narrativas que não cabem em alternativas         |

## 3. Painel de fontes externas

Aqui o sistema não calcula ainda. Ele organiza o que você consulta.

| Fonte                         | Entrada manual                                                |
| ----------------------------- | ------------------------------------------------------------- |
| Astrologia tropical ou védica | Print, PDF, posições, casas, aspectos, elementos              |
| Human Design                  | Tipo, estratégia, autoridade, perfil, cruz, canais, centros   |
| Tzolkin                       | Kin, tom, selo, onda encantada, oráculo, família              |
| Numerologia                   | Caminho de vida, expressão, alma, personalidade, ano pessoal  |
| Eneagrama                     | Tipo, asa, subtipo, instinto, flechas                         |
| Arquétipos Jung               | Arquétipo primário, secundário, sombra                        |
| Ikigai                        | Prazer, talento, necessidade do mundo, sustento               |
| Teste vocacional              | Chamados ranqueados e padrões de aptidão                      |
| Anamnese                      | Temas, frases fortes, traumas simbólicos, desejos e bloqueios |

Exemplo: no PDF do Tzolkin da Bárbara, a data 26/08/1991 retorna Kin 225, Serpente Auto-Existente Vermelha, com guia Kin 121, antípoda Kin 95, análogo Kin 134, oculto Kin 36 e família polar formada por Sol Amarelo, Serpente Vermelha, Cão Branco e Águia Azul. 

Exemplo: no Human Design anexado, a Bárbara aparece como Geradora Manifestante, estratégia Responder, autoridade Emocional, perfil 4/6, Cruz da Fênix Adormecida, assinatura Satisfação e tema do não-ser Frustração. 

Exemplo: no Astrolink, o mapa da Bárbara traz Sol em Virgem, Ascendente em Peixes, Lua em Peixes, distribuição energética com 34% Fogo, 29% Terra, 12% Ar e 25% Água, além de polarização 46% Yang e 54% Yin. 

## 4. Matriz de integração

Depois de inserir as fontes, o sistema deve ajudar você a integrar.

| Campo             | Exemplo de uso                                  |
| ----------------- | ----------------------------------------------- |
| Tema recorrente   | Cuidado, proteção, instinto, serviço, liderança |
| Luz principal     | O que aparece como força em vários sistemas     |
| Sombra principal  | O que aparece como distorção recorrente         |
| Tensão central    | O paradoxo entre diferentes sistemas            |
| Poder oculto      | Força que a pessoa subestima                    |
| Desafio evolutivo | O que precisa amadurecer                        |
| Arquétipo final   | Nome simbólico do Grimório                      |
| Frase-raiz        | Decreto ou síntese de ativação                  |

No caso da Bárbara, o Grimório fez exatamente isso: integrou Virgem e Peixes como “Artesã Mística”, Human Design como “Despertar da Fênix”, Eneagrama 8 como “Guardiã do Clã” e Kin 225 como “Oráculo da Pele”. 

## 5. Grimório Builder

O sistema precisa montar um Grimório editável, não apenas um relatório.

### Estrutura recomendada

| Página | Seção                          |
| -----: | ------------------------------ |
|      1 | Capa do Grimório               |
|      2 | Tudo está escrito nas estrelas |
|      3 | Arquitetura do Ser             |
|      4 | Bússola da Alma                |
|      5 | Motor Energético               |
|      6 | Escudo Social                  |
|      7 | Frequência Corporal            |
|      8 | Grande Integração              |
|      9 | Tabuleiro da Alma              |
|     10 | Ativação Arquetípica           |
|     11 | Rito de Assunção               |
|     12 | Fechamento e frase de poder    |

Essa estrutura já aparece muito bem no Grimório de Bárbara e deve virar o template base da Fase 1. 

---

# O que NÃO fazer na Fase 1

| Evitar                                    | Motivo                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| Construir cálculo próprio agora           | Vai atrasar o produto e travar em validações técnicas |
| Começar por astrologia védica completa    | Exige precisão, licença, lógica complexa e validação  |
| Criar relatório genérico automático       | O diferencial é o Grimório integrativo                |
| Colocar IA como autora principal          | A autoridade do método precisa continuar sendo sua    |
| Misturar todos os sistemas em abas soltas | O valor está na integração, não na coleção de mapas   |
| Fazer um formulário enorme sem lógica     | Vai cansar o cliente e gerar respostas superficiais   |

---

# Estrutura funcional da Fase 1 para Codex

## Rotas sugeridas

| Rota                                  | Função                                      |
| ------------------------------------- | ------------------------------------------- |
| `/religare`                           | Lista de perfis                             |
| `/religare/novo`                      | Criação de novo perfil                      |
| `/religare/perfil/[id]`               | Visão geral do perfil                       |
| `/religare/perfil/[id]/questionario`  | Questionário completo                       |
| `/religare/perfil/[id]/fontes`        | Uploads, prints, PDFs e resultados externos |
| `/religare/perfil/[id]/decodificacao` | Painel manual de análise                    |
| `/religare/perfil/[id]/integracao`    | Matriz de síntese                           |
| `/religare/perfil/[id]/grimorio`      | Builder do Grimório                         |
| `/religare/perfil/[id]/exportar`      | PDF, imagens e Context Pack                 |

## Entidades funcionais

Sem entrar em banco ou tecnologia, o Codex precisa pensar nestes objetos:

| Objeto                | Função                                                  |
| --------------------- | ------------------------------------------------------- |
| Perfil Cosmológico    | Dados básicos da pessoa                                 |
| Questionário Religare | Respostas estruturadas                                  |
| Fonte Externa         | Resultado vindo de Astrolink, site de Kin, HD, GPT, PDF |
| Fragmento Manual      | Trecho importante extraído de uma fonte                 |
| Tag Integrativa       | Tema transversal entre sistemas                         |
| Matriz de Síntese     | Cruzamento de luz, sombra, dom, desafio                 |
| Arquétipo Religare    | Nome simbólico final                                    |
| Grimório              | Documento visual e narrativo                            |
| Context Pack          | Resumo para conteúdo, marca e agentes                   |

---

# Questionário da Fase 1

## Bloco 1: Dados essenciais

| Pergunta                                           | Tipo                       |
| -------------------------------------------------- | -------------------------- |
| Qual é seu nome completo de nascimento?            | Texto                      |
| Qual nome você prefere que apareça no Grimório?    | Texto                      |
| Data de nascimento                                 | Data                       |
| Hora de nascimento                                 | Hora                       |
| A hora é exata?                                    | Exata, aproximada, não sei |
| Cidade e país de nascimento                        | Texto                      |
| Qual é o objetivo principal deste mapa?            | Múltipla escolha           |
| Em que área da vida você busca mais clareza agora? | Múltipla escolha           |

## Bloco 2: Momento de vida

| Pergunta                                           | Tipo   |
| -------------------------------------------------- | ------ |
| O que está pedindo transformação na sua vida hoje? | Aberta |
| Qual padrão você sente que está se repetindo?      | Aberta |
| O que você não quer mais carregar?                 | Aberta |
| O que você sente que está pronto para assumir?     | Aberta |
| Que decisão importante parece estar amadurecendo?  | Aberta |

## Bloco 3: Vocação

| Pergunta                                                 | Tipo   |
| -------------------------------------------------------- | ------ |
| O que você faz com naturalidade e as pessoas reconhecem? | Aberta |
| O que você faria mesmo sem aplauso?                      | Aberta |
| Que tipo de problema você gosta de resolver?             | Aberta |
| Quais temas você estuda por prazer?                      | Aberta |
| Que atividade faz o tempo desaparecer?                   | Aberta |
| Que trabalho drena sua energia rapidamente?              | Aberta |

## Bloco 4: Corpo, instinto e energia

| Pergunta                                                 | Tipo    |
| -------------------------------------------------------- | ------- |
| Como seu corpo costuma avisar que algo não está bom?     | Aberta  |
| O que te dá vitalidade?                                  | Aberta  |
| O que te tira do centro?                                 | Aberta  |
| Você decide mais pela mente, emoção, corpo ou intuição?  | Escolha |
| Como você reage quando se sente invadido ou pressionado? | Aberta  |

## Bloco 5: Sombra e defesa

| Pergunta                                                                              | Tipo    |
| ------------------------------------------------------------------------------------- | ------- |
| O que você mais tenta controlar?                                                      | Aberta  |
| O que você evita sentir?                                                              | Aberta  |
| Quando se sente ameaçado, você tende a atacar, fugir, agradar, congelar ou controlar? | Escolha |
| Que crítica costuma te ferir mais?                                                    | Aberta  |
| Que força sua você aprendeu a esconder?                                               | Aberta  |

## Bloco 6: Expressão e comunicação

| Pergunta                                                                     | Tipo                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Como você gosta de se expressar?                                             | Escrita, fala, arte, corpo, ensino, silêncio                    |
| Que tipo de linguagem parece mais sua?                                       | Poética, direta, técnica, ritualística, provocativa, acolhedora |
| O que você quer que as pessoas sintam ao entrar em contato com sua presença? | Aberta                                                          |
| Que palavras não combinam com você?                                          | Aberta                                                          |
| Que temas você sente que vieram através de você?                             | Aberta                                                          |

## Bloco 7: Marca e conteúdo, quando aplicável

| Pergunta                                     | Tipo   |
| -------------------------------------------- | ------ |
| Qual é o projeto, negócio ou marca?          | Texto  |
| O que você oferece?                          | Aberta |
| Para quem você oferece?                      | Aberta |
| Que transformação você facilita?             | Aberta |
| O que diferencia sua forma de conduzir?      | Aberta |
| Quais conteúdos você não quer mais produzir? | Aberta |
| Que tipo de público você não quer atrair?    | Aberta |

---

# Matriz de síntese manual

O painel de decodificação deve ter uma matriz assim:

| Camada      | Fonte principal            | Fontes de reforço         | Síntese                              |
| ----------- | -------------------------- | ------------------------- | ------------------------------------ |
| Essência    | Sol, Kin, Numerologia      | Arquétipo, anamnese       | Quem a pessoa é quando está coerente |
| Persona     | Ascendente, perfil HD      | Comunicação, marca        | Como a energia chega no mundo        |
| Emoção      | Lua, autoridade HD         | Eneagrama, corpo          | Como sente, decide e se regula       |
| Ação        | Marte, tipo HD             | Vocação, instinto         | Como move energia                    |
| Sombra      | Eneagrama, aspectos tensos | Anamnese, Lilith, Quíron  | Onde distorce ou se defende          |
| Vocação     | Meio do Céu, Ikigai        | Teste vocacional, Júpiter | Onde contribui                       |
| Comunicação | Mercúrio, arquétipo        | Voz de marca, conteúdo    | Como expressa                        |
| Rito        | Síntese final              | Corpo, símbolo, frase     | Prática de integração                |

---

# Como a Fase 1 prepara a Fase 2

A Fase 1 deve gerar dados bem estruturados para que a Fase 2 não comece do zero.

## O que precisa ser salvo em formato reaproveitável

| Item da Fase 1            | Uso na Fase 2                        |
| ------------------------- | ------------------------------------ |
| Resultado manual do Kin   | Validar cálculo próprio de Tzolkin   |
| Resultado manual do HD    | Validar biblioteca futura            |
| Prints astrológicos       | Validar posições e interpretações    |
| Fragmentos selecionados   | Criar base interpretativa própria    |
| Tags atribuídas por você  | Criar taxonomia de integração        |
| Síntese final do Grimório | Treinar padrão editorial e estrutura |
| Feedback do cliente       | Medir precisão percebida             |
| Perguntas mais úteis      | Refinar questionário dinâmico        |

A Fase 1 deve criar uma base de 20 a 50 mapas completos. Esses mapas viram o “dataset sagrado” do Religare.

---

# Fase 2: Base de cálculo própria

## Objetivo da Fase 2

Automatizar progressivamente os resultados que hoje vêm de sites, agentes e ferramentas externas.

## Ordem ideal de automação

| Ordem | Módulo                         | Complexidade | Valor              |
| ----: | ------------------------------ | ------------ | ------------------ |
|     1 | Tzolkin                        | Baixa        | Alto               |
|     2 | Numerologia                    | Baixa        | Alto               |
|     3 | Ano pessoal                    | Baixa        | Médio              |
|     4 | Arquétipos por scoring         | Média        | Alto               |
|     5 | Teste vocacional               | Média        | Alto               |
|     6 | Ikigai                         | Média        | Médio              |
|     7 | Eneagrama reduzido             | Média        | Alto               |
|     8 | Human Design básico            | Alta         | Alto               |
|     9 | Astrologia tropical            | Alta         | Alto               |
|    10 | Astrologia védica              | Muito alta   | Alto, mas sensível |
|    11 | Síntese integrativa automática | Muito alta   | Altíssimo          |

## Princípio da Fase 2

Cada automação deve substituir um campo manual existente.

Exemplo:

| Fase 1                            | Fase 2                                |
| --------------------------------- | ------------------------------------- |
| Felipe cola “Kin 225”             | Sistema calcula Kin 225               |
| Felipe cola tipo HD               | Sistema calcula tipo HD               |
| Felipe cola Sol, Lua e Ascendente | Sistema calcula mapa                  |
| Felipe marca tags manualmente     | Sistema sugere tags                   |
| Felipe escreve síntese            | Sistema monta rascunho estruturado    |
| Felipe cria Grimório              | Sistema gera primeira versão editável |

---

# Fase 2.1: Tzolkin e Numerologia

Primeira automação recomendada.

## Por quê

São módulos de alta personalização, baixa complexidade e boa percepção de valor.

## Entregas

| Entrega                 | Resultado                                |
| ----------------------- | ---------------------------------------- |
| Cálculo de Kin          | Kin, selo, tom, cor, família, onda       |
| Oráculo da Quinta Força | Destino, guia, análogo, antípoda, oculto |
| Numerologia de data     | Caminho de vida e ciclos                 |
| Numerologia de nome     | Expressão, alma, personalidade           |
| Ano pessoal             | Ciclo atual                              |

---

# Fase 2.2: Questionários com scoring

## Módulos

| Módulo             | Saída                                 |
| ------------------ | ------------------------------------- |
| Arquétipos Jung    | Primário, secundário, sombra          |
| Vocacional         | 3 a 5 chamados ranqueados             |
| Ikigai             | Zona de convergência                  |
| Eneagrama reduzido | Tipo provável, asa e tensão principal |

O Plano Mestre já prevê arquétipos por questionário, teste vocacional ranqueado e uso do Religare como base para PDFs e agentes externos. 

---

# Fase 2.3: Human Design e astrologia

## Recomendo entrar somente depois de validação

Motivos:

1. Dependem muito da precisão da hora e local.
2. Precisam ser comparados com mapas externos.
3. Podem gerar divergências por sistema, fuso, casas, zodíaco, ayanamsa e bibliotecas.
4. Astrologia védica traz complexidade maior que tropical.
5. Algumas bibliotecas podem ter implicações de licença.

Na prática: antes de prometer “cálculo próprio perfeito”, usar a Fase 1 para comparar 20 a 50 mapas e entender divergências.

---

# Fase 2.4: Base interpretativa própria

## Estrutura de cada fragmento

| Campo                 | Exemplo                                                 |
| --------------------- | ------------------------------------------------------- |
| Sistema               | Tzolkin                                                 |
| Código                | kin_225                                                 |
| Título                | Serpente Auto-Existente Vermelha                        |
| Camada                | Frequência Corporal                                     |
| Luz                   | Instinto, vitalidade, corpo, sobrevivência              |
| Sombra                | Reatividade, alerta constante, controle pelo medo       |
| Poder oculto          | Corpo como oráculo                                      |
| Desafio               | Criar forma para o instinto                             |
| Tags                  | corpo, instinto, vitalidade, limite, presença           |
| Aplicação pessoal     | Escutar o corpo antes de decidir                        |
| Aplicação de marca    | Comunicação visceral, magnética, sensorial              |
| Aplicação de conteúdo | Temas de corpo, presença, desejo, limite e renascimento |

A base interpretativa não deve copiar textos de sites. Ela deve usar os sites como referência de cálculo e validação, e transformar a linguagem em uma terminologia autoral Religare.

---

# Fase 3: Grimório semiautomático

A partir daqui, o sistema já pode gerar a primeira versão do Grimório.

## Fluxo

1. Sistema calcula dados.
2. Sistema aplica scoring do questionário.
3. Sistema cruza tags.
4. Sistema sugere arquétipo final.
5. Sistema monta estrutura do Grimório.
6. Felipe revisa.
7. Sistema exporta PDF.
8. Sistema gera imagem, wallpaper ou mapa ilustrado.

O Grimório continua sendo o principal produto premium.

---

# Nova organização do roadmap

## Fase 1: Manual assistido

| Entrega                   | Status desejado |
| ------------------------- | --------------- |
| Questionário Religare     | Operacional     |
| Upload de PDFs e prints   | Operacional     |
| Painel de fontes externas | Operacional     |
| Decodificação manual      | Operacional     |
| Matriz de integração      | Operacional     |
| Grimório Builder          | Operacional     |
| Exportação PDF            | Operacional     |
| Context Pack              | Operacional     |

## Fase 2: Cálculos internos básicos

| Entrega     | Status desejado    |
| ----------- | ------------------ |
| Tzolkin     | Automático         |
| Numerologia | Automático         |
| Ano pessoal | Automático         |
| Arquétipos  | Scoring automático |
| Vocacional  | Scoring automático |
| Ikigai      | Scoring automático |

## Fase 3: Cálculos avançados

| Entrega             | Status desejado     |
| ------------------- | ------------------- |
| Human Design        | Automático validado |
| Astrologia tropical | Automático validado |
| Astrologia védica   | Automático validado |
| Fase da Lua         | Automático          |
| Cruzamentos de tags | Semiautomático      |

## Fase 4: Síntese e conteúdo

| Entrega                 | Status desejado        |
| ----------------------- | ---------------------- |
| Grimório semiautomático | Rascunho editável      |
| PDF de essência         | Automático com revisão |
| PDF de marca            | Automático com revisão |
| Context Pack            | Automático             |
| Pilares de conteúdo     | Automático             |
| Voz de marca            | Automático             |

## Fase 5: Mapa ilustrado

| Entrega                    | Status desejado |
| -------------------------- | --------------- |
| Mapa visual                | Semiautomático  |
| Wallpaper                  | Semiautomático  |
| Cards de arquétipo         | Semiautomático  |
| Integração NotebookLM MCP  | Experimental    |
| Export Canva ou PDF visual | Experimental    |

---

# Prompt revisado para Codex

```text
Você é o agente de desenvolvimento do HUB Tecnológico da Vocaccio. Vamos redesenhar o módulo Religare em duas grandes fases.

Não planeje banco de dados, infraestrutura, autenticação, deploy ou escolha de stack. Aproveite a estrutura existente do projeto. Seu foco é produto, fluxo, UX, objetos funcionais, questionário, painel manual de decodificação, Grimório e preparação para automação futura.

Contexto:
Religare é o módulo de Cosmologia Pessoal Integrada da Vocaccio. Ele pode ser contratado individualmente por pessoas físicas, terapeutas, mentores e agências, ou junto da ferramenta de agência virtual de marketing. O produto final premium se chama Grimório Cosmológico, uma leitura integrativa que cruza astrologia, Human Design, Tzolkin, Eneagrama, numerologia, arquétipos, vocação, Ikigai e anamnese psicoespiritual.

Fase 1:
Criar uma ferramenta de questionário, organização e decodificação manual assistida. Nesta fase, o sistema não precisa calcular astrologia, Human Design, Tzolkin ou numerologia. O operador da Vocaccio irá consultar ferramentas externas, sites, PDFs, agentes GPT e IAs, e colar ou anexar os resultados no sistema.

A Fase 1 deve conter:
1. Cadastro de perfil cosmológico
2. Questionário Religare dinâmico
3. Upload de PDFs, prints e imagens de mapas
4. Painel de fontes externas
5. Campos estruturados para colar resultados manuais
6. Matriz de integração simbólica
7. Taxonomia de tags
8. Builder do Grimório Cosmológico
9. Exportação em PDF
10. Context Pack para briefing de conteúdo, marca e agentes externos

O sistema deve aceitar resultados manuais das seguintes fontes:
1. Astrologia tropical
2. Astrologia védica
3. Human Design
4. Tzolkin
5. Numerologia
6. Eneagrama
7. Arquétipos Jung
8. Ikigai
9. Teste vocacional
10. Anamnese psicoespiritual

O Grimório deve ser o principal resultado integrativo. Estrutura base:
1. Capa
2. Tudo está escrito nas estrelas
3. Arquitetura do Ser
4. Bússola da Alma
5. Motor Energético
6. Escudo Social
7. Frequência Corporal
8. Grande Integração
9. Tabuleiro da Alma
10. Ativação Arquetípica
11. Rito de Assunção
12. Fechamento e frase de poder

Cada fonte externa deve ter:
1. Nome da fonte
2. Tipo de sistema
3. Arquivo anexado
4. Resultado bruto
5. Resultado estruturado
6. Tags extraídas
7. Nível de confiança
8. Observações do operador
9. Campo “usar no Grimório”
10. Campo “usar no Context Pack”

A matriz de integração deve organizar:
1. Luzes
2. Sombras
3. Poderes ocultos
4. Desafios
5. Aptidões
6. Afinidades
7. Tendências
8. Ciclo atual
9. Arquétipo final
10. Frase-raiz
11. Rito sugerido
12. Aplicação para marca e conteúdo

Fase 2 em diante:
A Fase 2 deve automatizar progressivamente os mesmos campos que na Fase 1 são preenchidos manualmente. Não criar outro fluxo. A automação deve substituir fontes manuais por cálculos próprios sem quebrar a experiência da Fase 1.

Ordem sugerida para automação:
1. Tzolkin
2. Numerologia
3. Ano pessoal
4. Arquétipos por scoring
5. Teste vocacional por scoring
6. Ikigai
7. Eneagrama reduzido
8. Human Design
9. Astrologia tropical
10. Astrologia védica
11. Síntese integrativa
12. Grimório semiautomático

Crie as seguintes specs funcionais:
1. specs/religare/01-faseamento-religares.md
2. specs/religare/02-questionario-cosmologia-pessoal.md
3. specs/religare/03-painel-fontes-externas.md
4. specs/religare/04-matriz-integrativa.md
5. specs/religare/05-grimorio-builder.md
6. specs/religare/06-context-pack.md
7. specs/religare/07-roadmap-calculos-proprios.md

Critérios de pronto da Fase 1:
1. Um cliente consegue preencher o questionário completo
2. O operador consegue anexar ou colar resultados externos
3. O operador consegue transformar resultados brutos em campos estruturados
4. O sistema mostra uma matriz integrativa clara
5. O operador consegue montar um Grimório editável
6. O sistema exporta PDF
7. O sistema gera Context Pack
8. Nenhuma automação futura exige refazer o fluxo
9. Os campos manuais da Fase 1 podem ser preenchidos automaticamente na Fase 2

Critérios de linguagem:
Usar português brasileiro.
Evitar tom fatalista ou diagnóstico.
Não prometer cura.
Não substituir terapia.
Usar linguagem simbólica, profunda e prática.
Preservar o tom de Grimório, iniciação, mapa, rito, arquétipo e integração.
```

---

# Decisão estratégica final

A Fase 1 deve ser vendável mesmo sem cálculo próprio.

Ela entrega valor porque organiza melhor o seu método atual, reduz retrabalho, padroniza a experiência, melhora a coleta de dados e transforma o Grimório em um produto replicável.

A Fase 2 entra para aumentar margem, velocidade e escala.

Em termos simples:

| Fase   | Papel                                        |
| ------ | -------------------------------------------- |
| Fase 1 | Produto manual premium, com sistema de apoio |
| Fase 2 | Produto semiautomatizado                     |
| Fase 3 | Produto escalável com cálculos próprios      |
| Fase 4 | Produto integrado ao marketing consciente    |
| Fase 5 | Produto visual, ilustrado e ritualístico     |

O Grimório deve continuar sendo o núcleo premium. O questionário é a porta. Os cálculos são o motor. A integração é o diferencial.
