// Ported from OpenReply lib/utils/keyword-matcher.ts
// MIT License, Copyright (c) 2026 Anish Raj, Copyright (c) 2026 Diwen Huang
// https://github.com/diwenne/openreply

/**
 * Keyword Matcher
 *
 * Matches comment text against a set of keywords with support for:
 * - Case-insensitive matching
 * - Whole-word or partial matching
 * - Multi-keyword OR logic (any match = true)
 * - Emoji and special character stripping
 *
 * Unicode note: the original implementation used ASCII `\w` and `\b`, which
 * treat every Cyrillic / CJK / accented letter as a "special character" and a
 * non-word char. That silently deleted all non-Latin comment text before
 * matching, so a Russian keyword like "Клод" could never match. Everything
 * here uses Unicode property escapes (`\p{L}` letters, `\p{N}` numbers) with the
 * `u` flag so non-Latin scripts work.
 *
 * Diacritics note: `\p{L}` keeps accented letters intact, which is correct, but
 * it means "PREÇO" and "preco" stay different strings and never match each
 * other. Commenters type accents inconsistently and keyboards differ, so a
 * Portuguese or Spanish campaign keyed on "preco" silently misses every
 * commenter who typed "preço", and vice versa. `foldDiacritics` closes that
 * gap on BOTH sides of the comparison.
 */

export interface KeywordMatchResult {
  matched: boolean;
  matchedKeyword: string | null;
}

/**
 * Canonicalise Arabic-script text (Persian, Arabic, Urdu) before matching.
 *
 * `foldDiacritics` deliberately leaves non-Latin marks alone because they are
 * load bearing in Devanagari, Thai and Japanese. In the Arabic script they are
 * not: the letter variants below are the *same letter* typed on a different
 * keyboard, and harakat are optional vocalisation almost nobody types. Without
 * this step an Iranian account keyed on "لینک" misses every commenter whose
 * phone sends the Arabic yeh and kaf (U+064A / U+0643) instead of the Persian
 * ones (U+06CC / U+06A9) — the two strings look identical on screen and never
 * compare equal. The same holds for "کد۵" against a "کد5" keyword.
 *
 * Applied to both sides of the comparison, so it never matters which form the
 * account owner typed into the campaign builder.
 */
// Read this table by codepoint, not by eye: several sources render identically
// to their targets (U+064A vs U+06CC, U+0643 vs U+06A9) and the last rule
// matches characters that render as nothing at all.
const ARABIC_SCRIPT_FOLDING: Array<[RegExp, string]> = [
  // Same letter, different keyboard layout.
  [/[يىے]/gu, "ی"], // Arabic yeh, alef maksura, barree ye
  [/ك/gu, "ک"], // Arabic kaf -> Persian keheh
  [/ة/gu, "ه"], // teh marbuta -> heh
  [/[آأإٱ]/gu, "ا"], // alef w/ madda or hamza -> alef
  // Optional vocalisation and typographic padding: never semantic in Persian.
  [/[ً-ْٰ]/gu, ""], // harakat, sukun, superscript alef
  [/ـ/gu, ""], // tatweel / kashida stretching
  // ZWNJ is a rendering hint and half of Instagram types it while half does
  // not, so "قیمت‌ها" and "قیمتها" have to compare equal. Deleted rather than
  // turned into a space, because the no-separator spelling is the fallback
  // people actually type. Bidi marks go with it — they carry no meaning.
  [/[‌‎‏]/gu, ""],
];

// Persian (U+06F0..) and Arabic-Indic (U+0660..) digit blocks, both ordered 0-9.
const EASTERN_DIGITS = /[۰-۹٠-٩]/gu;

export function normalizeArabicScript(text: string): string {
  let out = text;
  for (const [pattern, replacement] of ARABIC_SCRIPT_FOLDING) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(EASTERN_DIGITS, (digit) => {
    const code = digit.codePointAt(0)!;
    const zero = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - zero);
  });
}

/**
 * A trigger keyword that is purely digits (optionally mixed with the letter
 * "o"/"O", the character it gets confused with) — e.g. "08", "17".
 */
function isNumericLikeKeyword(cleanedKeyword: string): boolean {
  return /^[0-9oO]+$/.test(cleanedKeyword);
}

/**
 * Fold the letter O into the digit 0. Commenters routinely type "O8" for a
 * "08" trigger word — same glyph on most fonts, and mobile autocapitalize
 * turns a leading "o" into "O" on top of that. Confirmed in production: a
 * numeric campaign keyword silently dropped every comment spelled with the
 * letter instead of the digit, with no error anywhere (matchKeywords just
 * returns unmatched, same as any other non-matching comment).
 *
 * Scoped to numeric-like keywords only (see isNumericLikeKeyword) so a real
 * word keyword ("love", "more info") is never affected by this fold.
 */
function foldNumericHomoglyphs(value: string): string {
  return value.replace(/o/gi, "0");
}

/**
 * Strip emojis and special characters from text, keeping only
 * letters (any script), numbers, and whitespace.
 */
export function stripSpecialCharacters(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu,
      ""
    )
    // Keep letters (any script), numbers, and combining marks; turn everything
    // else into a space. `\p{M}` has to be kept here or this replace undoes the
    // work foldDiacritics does further down the pipeline: a combining mark is
    // neither a letter nor a number, so without it "señor" typed in NFD becomes
    // "sen or", "किताब" becomes "क त ब", and Arabic harakat split every
    // vocalised Persian word into fragments. Marks survive this step and
    // foldDiacritics then decides, per script, which ones to drop.
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove diacritics from Latin-script text, leaving every other script byte
 * for byte identical.
 *
 * The scoping is the whole point and is not caution for its own sake. The
 * usual one-liner, `text.normalize("NFD").replace(/\p{M}/gu, "")`, is wrong
 * for a multi-script inbox because a combining mark is load bearing outside
 * Latin: it deletes Devanagari vowel signs ("किताब" becomes "कतब"), strips
 * Thai and Arabic vowel marks, folds Cyrillic "й" to "и" and Ukrainian "ї" to
 * "і", and turns the Japanese dakuten in "ガード" into "カート", which is a
 * different word. Only Latin marks are dropped here.
 *
 * Input is decomposed first so the function behaves the same whether the
 * source text arrived precomposed (U+00E9) or decomposed (U+0065 U+0301);
 * Instagram returns both.
 */
export function foldDiacritics(text: string): string {
  let out = "";
  let baseIsLatin = false;

  for (const char of text.normalize("NFD")) {
    if (/\p{M}/u.test(char)) {
      // A mark inherits the script of the base character before it, so the
      // base is what decides whether this mark is dropped or kept.
      if (!baseIsLatin) out += char;
      continue;
    }
    baseIsLatin = /\p{Script=Latin}/u.test(char);
    out += char;
  }

  return out.normalize("NFC");
}

/**
 * Check if a comment text matches any of the given keywords.
 *
 * Both sides are stripped of special characters and folded for Latin
 * diacritics before comparison, so "PREÇO" matches a "preco" keyword and a
 * "preço" keyword matches a "PRECO" comment.
 *
 * @param commentText - The raw comment text to check
 * @param keywords - Array of keywords to match against
 * @param wholeWordMatch - If true, keyword must be a standalone word.
 *                         If false, partial matches are allowed (e.g. "linking" matches "link")
 * @returns Match result with the first matched keyword (if any)
 */
export function matchKeywords(
  commentText: string,
  keywords: string[],
  wholeWordMatch: boolean = true
): KeywordMatchResult {
  if (!commentText || keywords.length === 0) {
    return { matched: false, matchedKeyword: null };
  }

  const cleanedText = foldDiacritics(
    stripSpecialCharacters(normalizeArabicScript(commentText))
  ).toLowerCase();

  if (!cleanedText) {
    return { matched: false, matchedKeyword: null };
  }

  for (const keyword of keywords) {
    const cleanedKeyword = foldDiacritics(
      stripSpecialCharacters(normalizeArabicScript(keyword))
    ).toLowerCase();

    if (!cleanedKeyword) continue;

    // Only numeric-like keywords get the O/0 fold — a word keyword compares
    // exactly as before.
    const numericLike = isNumericLikeKeyword(cleanedKeyword);
    const compareText = numericLike
      ? foldNumericHomoglyphs(cleanedText)
      : cleanedText;
    const compareKeyword = numericLike
      ? foldNumericHomoglyphs(cleanedKeyword)
      : cleanedKeyword;

    if (wholeWordMatch) {
      const escapedKeyword = compareKeyword.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      // Unicode-aware "whole word": the keyword must not be flanked by another
      // letter or number. Lookarounds replace ASCII `\b`, which never fires
      // between two non-Latin characters.
      const regex = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapedKeyword}(?![\\p{L}\\p{N}])`,
        "iu"
      );
      if (regex.test(compareText)) {
        return { matched: true, matchedKeyword: keyword };
      }
    } else {
      if (compareText.includes(compareKeyword)) {
        return { matched: true, matchedKeyword: keyword };
      }
    }
  }

  return { matched: false, matchedKeyword: null };
}
