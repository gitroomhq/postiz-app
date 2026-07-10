> RESPOSTAS DO GEMINI PARA NOS AJUDAR A CONSTRUIR O AGENTE DE WHATSAPP QUE ATUALIZA O KANBAN E FLUXO DE APROVAÇÕES, FUTURAMENTE SENDO ATÉ ALTERAÇÕES NAS ARTES E VÍDEOS.

## Visão Geral: Agente WhatsApp no Ecossistema Vocaccio

A ideia de plugar um agente direto nos grupos para atualizar o Kanban e fazer a ponte de atendimento reflete perfeitamente a premissa de reduzir o peso operacional sem perder a essência. Iniciar com uma abordagem de laboratório (Open Source, conexão via QR Code), sem envolver a Meta Cloud API oficial logo de cara, é a estratégia mais inteligente para validar o fluxo e encaixar nas Fases do `PLANO-MESTRE.md` (especialmente antecipando integrações de automação que estavam previstas apenas para as fases mais avançadas).

Aqui estão as rotas técnicas mapeadas, baseadas em bibliotecas como Baileys e whatsmeow, que se conectam via QR Code e integram-se naturalmente ao Claude Code e à stack técnica da Vocaccio:

### 1. Plugins Nativos para Claude Code (A Rota Direta)
Esses plugins rodam diretamente no CLI do Claude Code. Eles conectam o Claude à rede do WhatsApp Web, permitindo que a IA atue como uma interface de chat no seu terminal. Ideais para testes rápidos e validação de agentes operacionais.

* **[Rich627/whatsapp-claude-plugin](https://github.com/rich627/whatsapp-claude-plugin)**
  * **Como funciona:** Construído em cima do Baileys (Node.js), não exige chaves de API ou contêineres Docker. A instalação é via marketplace do Claude e o pareamento é feito gerando um QR Code no próprio terminal.
  * **O diferencial:** Possui suporte nativo à transcrição de voz (perfeito para ouvir áudios de clientes com feedbacks e aprovações) e um sistema de "Permission relay". Se o Claude precisar executar uma ferramenta local (como atualizar o banco de dados do Supabase ou mover um card no Kanban), ele pode pedir autorização e você aprova remotamente de dentro do próprio WhatsApp. O controle de acesso é restrito via *allowlist*.
* **[crisandrews/claude-whatsapp](https://github.com/crisandrews/claude-whatsapp)**
  * **Como funciona:** Outra excelente opção nativa que preenche a lacuna de acesso contínuo.
  * **O diferencial:** Oferece um controle granular sobre políticas de mensagens e escopo de histórico por chat ("cross-chat scope"). Isso permite que você isole o contexto da memória para projetos específicos, garantindo que o agente não confunda as informações de clientes distintos do seu CRM. Possui debouncing embutido para lidar com mensagens rápidas.

### 2. Servidores MCP Independentes (A Rota Desacoplada)
Se o objetivo for permitir que os seus agentes web (como o Ron Weasley ou o próprio dashboard da Vocaccio) consultem o WhatsApp sem depender do seu CLI rodando na máquina o tempo todo, conectar um servidor MCP dedicado à sua arquitetura é o melhor caminho a médio prazo.

* **[jlucaso1/whatsapp-mcp-ts](https://github.com/jlucaso1/whatsapp-mcp-ts)**
  * **Como funciona:** Um servidor MCP construído inteiramente em TypeScript utilizando a biblioteca Baileys. Ele salva as mensagens e a sessão de autenticação localmente em um banco de dados SQLite.
  * **O diferencial:** Por ser 100% TS, ele se encaixa com zero atrito na stack do seu ecossistema (Next.js/NestJS). Qualquer necessidade de manutenção, correção ou expansão será facilmente absorvida pelos seus scripts e pelos seus agentes desenvolvedores internos (como o Bill Weasley).
* **[lharries/whatsapp-mcp](https://github.com/lharries/whatsapp-mcp)**
  * **Como funciona:** Utiliza Go (`whatsmeow`) para estabelecer a ponte de conexão com o WhatsApp e um servidor Python para expor as ferramentas MCP. 
  * **O diferencial:** É um dos projetos open-source mais robustos (mais de 5k stars). Ele armazena o histórico em SQLite, o que permite que os agentes façam buscas retroativas ("O que o cliente aprovou na semana passada?") de forma assíncrona, sem precisarem interagir de volta com o WhatsApp em tempo real.

### 3. A Rota VPS + Webhook (A Rota de Produção 24/7)
Conforme visto nas referências do YouTube, para garantir que o agente não pare de responder caso o seu computador seja desligado, a instalação em nuvem (como a Hostinger VPS) com gerenciamento de processos (PM2) é obrigatória para uma operação contínua.
* **Veredito para o momento atual:** Esse formato costuma envolver APIs não oficiais paralelas (como Z-API ou Evolution API), o que adiciona custos extras e uma complexidade que não é necessária nesta fase inicial. É melhor validar o modelo localmente (Rotas 1 ou 2) antes de subir a infraestrutura.

---

### ⚠️ Protocolo de Segurança: Estratégia Contra Banimentos (Blocks)
O uso de bibliotecas de automação via QR Code viola os termos de serviço da Meta. Como a empresa é rigorosa no monitoramento, para proteger o número e manter o agente rodando no *back office*, aplique estas regras:

1. **Isolamento de Uso:** Restrinja o número estritamente para o canal interno / grupo com os clientes (use ferramentas de *allowlist*). Não o utilize para disparos massivos, campanhas de growth ou respostas frias comerciais neste MVP.
2. **Delay Humano (Debouncing):** Configure atrasos (delays) de resposta. O agente deve ter a instrução de consolidar mensagens curtas recebidas em sequência (muito comum no WhatsApp) e só responder alguns segundos depois, evitando mandar textos divididos mecanicamente.
3. **Aquecimento do Chip:** Não aplique a automação em um número zerado. Se comprar um chip novo, coloque em um aparelho celular real, entre em grupos e converse normalmente com humanos por 10 a 15 dias antes de escanear o QR Code no terminal.

### 📍 Sugestão de Encaixe no seu Ecossistema
Para alinhar com as fases do seu **PLANO-MESTRE.md**, recomendo iniciar testando o **plugin do Rich627** de forma isolada enquanto você estrutura a Fase 2 (Kanban). Isso vai permitir dar ao agente interno (como o **Ron Weasley**) a visão clara do que entra via chat, com transcrição de áudio nativa e possibilidade de atualização direta no card.
