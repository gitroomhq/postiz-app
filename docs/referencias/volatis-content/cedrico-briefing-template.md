# DNA do Projeto — anexo para o Volatis | Redator (GPT)

> Este é o documento que a pessoa **anexa na conversa com o Volatis | Redator** (o GPT) antes de gerar
> um carrossel. O gerador Vocaccio produz uma versão pré-preenchida com os dados da marca pelo botão
> **"Exportar DNA do Projeto"** no painel *Conteúdo (IA)* do editor. A pessoa completa os campos em
> branco (nicho, público, experts, tema) e anexa no ChatGPT.
>
> **Estrutura: por MARCA, com os experts dentro.** Uma marca pode ter vários experts (autoridades que
> assinam o conteúdo). Cada carrossel pertence a uma marca. **Sem dados visuais** (cor, fonte, estilo):
> o visual é construído no gerador, não pelo agente.
>
> O export imediato puxa o que existe no BrandKit (nome, @handle, CTA). Quando o **Religare** existir
> (Fase 5), ele preencherá tom de voz, público e os experts automaticamente — o DNA do Projeto é,
> conceitualmente, o export do Religare. Ver `[[project-religare-volatis-integracao]]`.

---

## Estrutura do DNA do Projeto

```markdown
# DNA do Projeto — {Marca}

## Marca
- Nome: {brandName}
- @handle: {handle}
- Nicho: {ex: liderança e RH, fitness, imobiliário}
- Público: {para quem é — cargo, momento, dor central}
- Tom de voz: {ex: jornalístico sóbrio, provocativo, acolhedor}
- CTA padrão do último slide: {ex: "Marque um café virtual comigo", "Comenta GUIA"}

## Experts (autoridades que falam pela marca)
> Liste um bloco por expert. Uma marca pode ter vários.
- Expert 1
  - Nome: {nome}
  - Especialidade / autoridade: {ex: psicóloga organizacional, 15 anos em RH}
  - Voz / posicionamento: {o ângulo que esse expert defende}
- Expert 2 (se houver): {...}

## Este carrossel
- Tema / insumo: {colar texto, link de referência ou descrever a ideia}
- Nº de slides: {5 | 7 | 9 | 12}
- Headline preferida (opcional): {se já tiver uma}

## Instrução final
Gere o carrossel no formato pareado "texto N" (ímpar = título, par = corpo), pronto para colar
no campo "Aplicar texto" do gerador Vocaccio. {Nº de slides} slides = {Nº × 2} textos.
```
