# Como configurar o GPT — Volatis | Gerador de Carrosséis Virais

Passo a passo para criar o GPT customizado que gera o texto dos carrosséis.

## Pré-requisitos
- Conta **ChatGPT Plus, Team ou Enterprise** (criar GPTs exige plano pago).
- Os arquivos da pasta: `C:\dev\vocaccio\docs\referencias\volatis-content\`

## Arquivos que você vai usar
- **System prompt** (vai no campo Instructions): `cedrico-gpt-instructions.md` → copie só a seção **`## INSTRUCTIONS (colar no GPT Builder)`** (do título até o fim).
- **Knowledge essenciais** (anexar como arquivos):
  - `volatis-banco-de-headlines.md` — padrões de hook que viralizam
  - `volatis-filtro-editorial.md` — o que nunca escrever (anti cara de IA)
  - `volatis-manual-de-qualidade.md` — 7 parâmetros + contagem de palavras por texto
  - `volatis-referencias.md` — exemplos completos de carrossel (âncora de qualidade)
- **Knowledge opcionais** (o gerador Vocaccio já cuida do visual; anexe só se quiser dar mais contexto):
  - `volatis-principios-design.md`, `volatis-design-system.md`

## Passos

### 1. Abrir o criador de GPT
ChatGPT → menu lateral → **Explore GPTs** (ou "Explorar GPTs") → botão **+ Create** (canto superior direito) → aba **Configure** (não use a aba "Create" por conversa; a Configure deixa colar tudo de uma vez).

### 2. Nome
```
Volatis | Gerador de Carrosséis Virais
```

### 3. Description
```
Cria carrosséis virais para Instagram no formato pronto para colar no gerador Vocaccio. Headlines de alto desempenho, copy editorial e saída em texto numerado.
```

### 4. Instructions
Abra `cedrico-gpt-instructions.md`, copie tudo a partir de `## INSTRUCTIONS (colar no GPT Builder)` até o final do arquivo e cole no campo **Instructions**. (São cerca de 7.500 caracteres; o limite é 8.000.)

### 5. Conversation starters
Adicione os três:
```
Tenho um conteúdo pronto para virar carrossel
Quero criar um carrossel a partir de uma ideia
Já anexei o briefing do cliente, vamos começar
```

### 6. Knowledge
Em **Knowledge → Upload files**, suba os 4 arquivos essenciais (e os 2 opcionais, se quiser).

### 7. Capabilities
- **Web Search: LIGADO** (ajuda a buscar dados e tendências reais para o conteúdo).
- **Canvas, DALL·E (image), Code Interpreter: DESLIGADOS** (o GPT só gera texto; o visual é feito no gerador Vocaccio).

### 8. Modelo
Deixe o modelo mais capaz disponível na sua conta.

### 9. Salvar
Botão **Create / Save** no topo → escolha a visibilidade (**Only me** para uso interno, ou link/publicado se for compartilhar com a equipe).

## Como usar no dia a dia
1. No editor do gerador Vocaccio, painel **Conteúdo (IA)** → botão **Exportar briefing p/ o GPT** → baixa `briefing-{marca}.md`.
2. Abra o GPT, **anexe o briefing** na conversa e complete o que faltar (nicho, público, tema, headline).
3. O GPT entrega as headlines → você escolhe uma → ele gera o texto final no formato `texto N`.
4. Copie a saída → cole no campo **Aplicar texto** do editor → clique **Aplicar texto**. O carrossel é montado de uma vez.

## Lembretes
- O número de pares de texto define o número de slides (9 slides = 18 textos). Mire em 5/7/9/12.
- Ímpar = título (primário), par = corpo (secundário). O último par leva a chamada à ação.
- Nunca use hífen ou travessão dentro do conteúdo dos textos.
