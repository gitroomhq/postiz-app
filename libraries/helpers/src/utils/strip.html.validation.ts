import striptags from 'striptags';
import { parseFragment, serialize } from 'parse5';

const bold = {
  a: '𝗮',
  b: '𝗯',
  c: '𝗰',
  d: '𝗱',
  e: '𝗲',
  f: '𝗳',
  g: '𝗴',
  h: '𝗵',
  i: '𝗶',
  j: '𝗷',
  k: '𝗸',
  l: '𝗹',
  m: '𝗺',
  n: '𝗻',
  o: '𝗼',
  p: '𝗽',
  q: '𝗾',
  r: '𝗿',
  s: '𝘀',
  t: '𝘁',
  u: '𝘂',
  v: '𝘃',
  w: '𝘄',
  x: '𝘅',
  y: '𝘆',
  z: '𝘇',
  A: '𝗔',
  B: '𝗕',
  C: '𝗖',
  D: '𝗗',
  E: '𝗘',
  F: '𝗙',
  G: '𝗚',
  H: '𝗛',
  I: '𝗜',
  J: '𝗝',
  K: '𝗞',
  L: '𝗟',
  M: '𝗠',
  N: '𝗡',
  O: '𝗢',
  P: '𝗣',
  Q: '𝗤',
  R: '𝗥',
  S: '𝗦',
  T: '𝗧',
  U: '𝗨',
  V: '𝗩',
  W: '𝗪',
  X: '𝗫',
  Y: '𝗬',
  Z: '𝗭',
  '1': '𝟭',
  '2': '𝟮',
  '3': '𝟯',
  '4': '𝟰',
  '5': '𝟱',
  '6': '𝟲',
  '7': '𝟳',
  '8': '𝟴',
  '9': '𝟵',
  '0': '𝟬',
};

const underlineMap = {
  a: 'a̲',
  b: 'b̲',
  c: 'c̲',
  d: 'd̲',
  e: 'e̲',
  f: 'f̲',
  g: 'g̲',
  h: 'h̲',
  i: 'i̲',
  j: 'j̲',
  k: 'k̲',
  l: 'l̲',
  m: 'm̲',
  n: 'n̲',
  o: 'o̲',
  p: 'p̲',
  q: 'q̲',
  r: 'r̲',
  s: 's̲',
  t: 't̲',
  u: 'u̲',
  v: 'v̲',
  w: 'w̲',
  x: 'x̲',
  y: 'y̲',
  z: 'z̲',
  A: 'A̲',
  B: 'B̲',
  C: 'C̲',
  D: 'D̲',
  E: 'E̲',
  F: 'F̲',
  G: 'G̲',
  H: 'H̲',
  I: 'I̲',
  J: 'J̲',
  K: 'K̲',
  L: 'L̲',
  M: 'M̲',
  N: 'N̲',
  O: 'O̲',
  P: 'P̲',
  Q: 'Q̲',
  R: 'R̲',
  S: 'S̲',
  T: 'T̲',
  U: 'U̲',
  V: 'V̲',
  W: 'W̲',
  X: 'X̲',
  Y: 'Y̲',
  Z: 'Z̲',
  '1': '1̲',
  '2': '2̲',
  '3': '3̲',
  '4': '4̲',
  '5': '5̲',
  '6': '6̲',
  '7': '7̲',
  '8': '8̲',
  '9': '9̲',
  '0': '0̲',
};

const italic = {
  a: '𝘢',
  b: '𝘣',
  c: '𝘤',
  d: '𝘥',
  e: '𝘦',
  f: '𝘧',
  g: '𝘨',
  h: '𝘩',
  i: '𝘪',
  j: '𝘫',
  k: '𝘬',
  l: '𝘭',
  m: '𝘮',
  n: '𝘯',
  o: '𝘰',
  p: '𝘱',
  q: '𝘲',
  r: '𝘳',
  s: '𝘴',
  t: '𝘵',
  u: '𝘶',
  v: '𝘷',
  w: '𝘸',
  x: '𝘹',
  y: '𝘺',
  z: '𝘻',
  A: '𝘈',
  B: '𝘉',
  C: '𝘊',
  D: '𝘋',
  E: '𝘌',
  F: '𝘍',
  G: '𝘎',
  H: '𝘏',
  I: '𝘐',
  J: '𝘑',
  K: '𝘒',
  L: '𝘓',
  M: '𝘔',
  N: '𝘕',
  O: '𝘖',
  P: '𝘗',
  Q: '𝘘',
  R: '𝘙',
  S: '𝘚',
  T: '𝘛',
  U: '𝘜',
  V: '𝘝',
  W: '𝘞',
  X: '𝘟',
  Y: '𝘠',
  Z: '𝘡',
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
};

const strikethrough = {
  a: 'a̶',
  b: 'b̶',
  c: 'c̶',
  d: 'd̶',
  e: 'e̶',
  f: 'f̶',
  g: 'g̶',
  h: 'h̶',
  i: 'i̶',
  j: 'j̶',
  k: 'k̶',
  l: 'l̶',
  m: 'm̶',
  n: 'n̶',
  o: 'o̶',
  p: 'p̶',
  q: 'q̶',
  r: 'r̶',
  s: 's̶',
  t: 't̶',
  u: 'u̶',
  v: 'v̶',
  w: 'w̶',
  x: 'x̶',
  y: 'y̶',
  z: 'z̶',
  A: 'A̶',
  B: 'B̶',
  C: 'C̶',
  D: 'D̶',
  E: 'E̶',
  F: 'F̶',
  G: 'G̶',
  H: 'H̶',
  I: 'I̶',
  J: 'J̶',
  K: 'K̶',
  L: 'L̶',
  M: 'M̶',
  N: 'N̶',
  O: 'O̶',
  P: 'P̶',
  Q: 'Q̶',
  R: 'R̶',
  S: 'S̶',
  T: 'T̶',
  U: 'U̶',
  V: 'V̶',
  W: 'W̶',
  X: 'X̶',
  Y: 'Y̶',
  Z: 'Z̶',
  0: '0̶',
  1: '1̶',
  2: '2̶',
  3: '3̶',
  4: '4̶',
  5: '5̶',
  6: '6̶',
  7: '7̶',
  8: '8̶',
  9: '9̶',
};

const blockquote = {
  a: 'ａ',
  b: 'ｂ',
  c: 'ｃ',
  d: 'ｄ',
  e: 'ｅ',
  f: 'ｆ',
  g: 'ｇ',
  h: 'ｈ',
  i: 'ｉ',
  j: 'ｊ',
  k: 'ｋ',
  l: 'ｌ',
  m: 'ｍ',
  n: 'ｎ',
  o: 'ｏ',
  p: 'ｐ',
  q: 'ｑ',
  r: 'ｒ',
  s: 'ｓ',
  t: 'ｔ',
  u: 'ｕ',
  v: 'ｖ',
  w: 'ｗ',
  x: 'ｘ',
  y: 'ｙ',
  z: 'ｚ',
  A: 'Ａ',
  B: 'Ｂ',
  C: 'Ｃ',
  D: 'Ｄ',
  E: 'Ｅ',
  F: 'Ｆ',
  G: 'Ｇ',
  H: 'Ｈ',
  I: 'Ｉ',
  J: 'Ｊ',
  K: 'Ｋ',
  L: 'Ｌ',
  M: 'Ｍ',
  N: 'Ｎ',
  O: 'Ｏ',
  P: 'Ｐ',
  Q: 'Ｑ',
  R: 'Ｒ',
  S: 'Ｓ',
  T: 'Ｔ',
  U: 'Ｕ',
  V: 'Ｖ',
  W: 'Ｗ',
  X: 'Ｘ',
  Y: 'Ｙ',
  Z: 'Ｚ',
  0: '０',
  1: '１',
  2: '２',
  3: '３',
  4: '４',
  5: '５',
  6: '６',
  7: '７',
  8: '８',
  9: '９',
};

const code = {
  a: '𝚊',
  b: '𝚋',
  c: '𝚌',
  d: '𝚍',
  e: '𝚎',
  f: '𝚏',
  g: '𝚐',
  h: '𝚑',
  i: '𝚒',
  j: '𝚓',
  k: '𝚔',
  l: '𝚕',
  m: '𝚖',
  n: '𝚗',
  o: '𝚘',
  p: '𝚙',
  q: '𝚚',
  r: '𝚛',
  s: '𝚜',
  t: '𝚝',
  u: '𝚞',
  v: '𝚟',
  w: '𝚠',
  x: '𝚡',
  y: '𝚢',
  z: '𝚣',
  A: '𝙰',
  B: '𝙱',
  C: '𝙲',
  D: '𝙳',
  E: '𝙴',
  F: '𝙵',
  G: '𝙶',
  H: '𝙷',
  I: '𝙸',
  J: '𝙹',
  K: '𝙺',
  L: '𝙻',
  M: '𝙼',
  N: '𝙽',
  O: '𝙾',
  P: '𝙿',
  Q: '𝚀',
  R: '𝚁',
  S: '𝚂',
  T: '𝚃',
  U: '𝚄',
  V: '𝚅',
  W: '𝚆',
  X: '𝚇',
  Y: '𝚈',
  Z: '𝚉',
  0: '𝟶',
  1: '𝟷',
  2: '𝟸',
  3: '𝟹',
  4: '𝟺',
  5: '𝟻',
  6: '𝟼',
  7: '𝟽',
  8: '𝟾',
  9: '𝟿',
};

export const stripHtmlValidation = (
  type: 'none' | 'normal' | 'markdown' | 'html',
  val: string,
  replaceBold = false,
  none = false,
  plain = false,
  convertMentionFunction?: (idOrHandle: string, name: string) => string
): string => {
  if (plain) {
    return val;
  }

  const value = serialize(parseFragment(val));

  if (type === 'none') {
    return striptags(value)
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  if (type === 'html') {
    return striptags(convertMention(value, convertMentionFunction), [
      'ul',
      'li',
      'h1',
      'h2',
      'h3',
      'p',
      'strong',
      'u',
      'a',
      'em',
      's',
      'code',
      'blockquote',
    ])
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<')
      .replace(/&amp;/gi, '&')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  if (type === 'markdown') {
    return striptags(
      convertMention(
        value
          .replace(/<h1>([.\s\S]*?)<\/h1>/g, (match, p1) => {
            return `<h1># ${p1}</h1>\n`;
          })
          .replace(/&amp;/gi, '&')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/<h2>([.\s\S]*?)<\/h2>/g, (match, p1) => {
            return `<h2>## ${p1}</h2>\n`;
          })
          .replace(/<h3>([.\s\S]*?)<\/h3>/g, (match, p1) => {
            return `<h3>### ${p1}</h3>\n`;
          })
          .replace(/<u>([.\s\S]*?)<\/u>/g, (match, p1) => {
            return `<u>__${p1}__</u>`;
          })
          .replace(/<strong>([.\s\S]*?)<\/strong>/g, (match, p1) => {
            return `<strong>**${p1}**</strong>`;
          })
          .replace(/<li.*?>([.\s\S]*?)<\/li.*?>/gm, (match, p1) => {
            return `<li>- ${p1.replace(/\n/gm, '')}</li>`;
          })
          .replace(/<p>([.\s\S]*?)<\/p>/g, (match, p1) => {
            return `<p>${p1}</p>\n`;
          })
          .replace(
            /<a.*?href="([.\s\S]*?)".*?>([.\s\S]*?)<\/a>/g,
            (match, p1, p2) => {
              return `<a href="${p1}">[${p2}](${p1})</a>`;
            }
          ),
        convertMentionFunction
      )
    )
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<');
  }

  if (value.indexOf('<p>') === -1 && !none) {
    return value;
  }

  const html = (value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^<p[^>]*>/i, '')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '');

  if (none) {
    return striptags(html).replace(/&gt;/gi, '>').replace(/&lt;/gi, '<');
  }

  if (replaceBold) {
    const processedHtml = convertMention(
      convertToAscii(
        html
          .replace(
            /<a.*?href="([.\s\S]*?)".*?>([.\s\S]*?)<\/a>/g,
            (match, p1, p2) => {
              return `<a href="${p1}">${p1}</a>`;
            }
          )
          .replace(/<ul>/, '\n<ul>')
          .replace(/<\/ul>\n/, '</ul>')
          .replace(/<li.*?>([.\s\S]*?)<\/li.*?>/gm, (match, p1) => {
            return `<li><p>- ${p1.replace(/\n/gm, '')}\n</p></li>`;
          })
      ),
      convertMentionFunction
    );

    return striptags(processedHtml)
      .replace(/&gt;/gi, '>')
      .replace(/&lt;/gi, '<')
      .replace(/&𝗹𝘁;/gi, '<')
      .replace(/&𝗴𝘁;/gi, '>')
      .replace(/&g̲t̲;/gi, '>')
      .replace(/&l̲t̲;/gi, '<');
  }

  // Strip all other tags
  return striptags(html, ['ul', 'li', 'h1', 'h2', 'h3'])
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<');
};

export const convertMention = (
  value: string,
  process?: (idOrHandle: string, name: string) => string
) => {
  if (!process) {
    return value;
  }

  return value.replace(
    /<span.*?data-mention-id="([.\s\S]*?)"[.\s\S]*?>([.\s\S]*?)<\/span>/gi,
    (match, id, name) => {
      return `<span>` + process(id, name) + `</span>`;
    }
  );
};

export const convertToAscii = (value: string): string => {
  return value
    .replace(/<strong>([\s\S]+?)<\/strong>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        // @ts-ignore
        return bold?.[char] || char;
      });

      return match.replace(p1, replacer.join(''));
    })
    .replace(/<u>([\s\S]+?)<\/u>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        // @ts-ignore
        return underlineMap?.[char] || char;
      });

      return match.replace(p1, replacer.join(''));
    })
    .replace(/<em>([\s\S]+?)<\/em>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        return italic?.[char] || char;
      });
      return match.replace(p1, replacer.join(''));
    })
    .replace(/<s>([\s\S]+?)<\/s>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        return strikethrough?.[char] || char;
      });
      return match.replace(p1, replacer.join(''));
    })
    .replace(/<blockquote>([\s\S]+?)<\/blockquote>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        return blockquote?.[char] || char;
      });
      return match.replace(p1, replacer.join(''));
    })
    .replace(/<code>([\s\S]+?)<\/code>/gi, (match, p1) => {
      const replacer = p1.split('').map((char: string) => {
        return code?.[char] || char;
      });
      return match.replace(p1, replacer.join(''));
    });
};
