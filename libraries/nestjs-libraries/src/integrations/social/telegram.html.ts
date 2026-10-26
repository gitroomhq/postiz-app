import { parseFragment } from 'parse5';

// Telegram reads a message or a caption sent with parse_mode HTML and accepts
// only its own tags (https://core.telegram.org/bots/api#html-style). This
// turns the editor HTML into that dialect: every other tag becomes text, and
// the characters Telegram treats as markup are escaped.

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) =>
  escapeText(value).replace(/"/g, '&quot;');

// editor tag -> Telegram tag
const inlineTags: Record<string, string> = {
  b: 'b',
  strong: 'b',
  i: 'i',
  em: 'i',
  u: 'u',
  ins: 'u',
  s: 's',
  strike: 's',
  del: 's',
  code: 'code',
  pre: 'pre',
  blockquote: 'blockquote',
  'tg-spoiler': 'tg-spoiler',
};

// The text reaches the provider with its entities decoded, so a "<" that does
// not start a tag the editor can produce is text, like "a<b" or "x < 3".
const knownTag =
  /^<\/?(?:b|strong|i|em|u|ins|s|strike|del|code|pre|blockquote|tg-spoiler|a|p|br|div|h[1-6]|ul|ol|li|span|img)\b[^<>]*>/i;

const escapeStrayBrackets = (html: string) =>
  html.replace(/</g, (bracket, offset: number) =>
    knownTag.test(html.slice(offset)) ? bracket : '&lt;'
  );

const attribute = (node: any, name: string): string | undefined =>
  (node.attrs || []).find((a: any) => a.name === name)?.value;

const walk = (node: any): string => {
  if (node.nodeName === '#text') {
    return escapeText(node.value || '');
  }

  const children = (node.childNodes || []).map(walk).join('');
  const tag = (node.tagName || '').toLowerCase();

  if (tag === 'br') {
    return '\n';
  }

  // the editor keeps every line in its own paragraph, an empty one is a
  // blank line
  if (tag === 'p' || tag === 'div') {
    return `${children}\n`;
  }

  // Telegram has no headings and no lists
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    return `<b>${children}</b>\n`;
  }

  if (tag === 'li') {
    return `• ${children}\n`;
  }

  if (tag === 'a') {
    const href = attribute(node, 'href');
    return href
      ? `<a href="${escapeAttribute(href)}">${children}</a>`
      : children;
  }

  if (tag === 'span' && /\btg-spoiler\b/.test(attribute(node, 'class') || '')) {
    return `<tg-spoiler>${children}</tg-spoiler>`;
  }

  if (tag === 'img') {
    return '';
  }

  const telegramTag = inlineTags[tag];
  if (telegramTag) {
    return `<${telegramTag}>${children}</${telegramTag}>`;
  }

  return children;
};

export const telegramHtml = (html: string): string =>
  (parseFragment(escapeStrayBrackets(html || '')).childNodes as any[])
    .map(walk)
    .join('')
    .replace(/\n+$/, '');
