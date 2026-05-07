/**
 * Converte texto plano (com `\n` e `\n\n`) em HTML para o Tiptap.
 *
 * Tiptap interpreta a string passada para `setContent` como HTML, entao
 * `\n` puro e descartado pelo browser durante o parse — o que apaga as
 * quebras de linha que o LLM coloca por instrucao da persona ("1 linha
 * vazia entre cada frase").
 *
 * Regras:
 *  - linha vazia (\n\n) vira FRONTEIRA entre paragrafos com paragrafo
 *    vazio entre eles: `<p>foo</p><p></p><p>bar</p>`. Sem o paragrafo
 *    vazio do meio, o ProseMirror empilha os dois `<p>` sem gap visual,
 *    porque o reset de margem do editor neutraliza a margem default do
 *    browser. O `<p></p>` vazio replica o comportamento de "Enter duas
 *    vezes" e gera linha em branco visivel no editor.
 *  - quebra simples (\n) dentro de um paragrafo vira `<br>`
 *  - chars HTML sao escapados para evitar que conteudo do LLM injete
 *    tags inesperadas no editor
 */
export function textToTiptapHtml(text: string): string {
  if (!text) return '';
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => `<p>${escape(para).replace(/\n/g, '<br>')}</p>`)
    .join('<p></p>');
}
