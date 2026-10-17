import { describe, expect, it, vi } from 'vitest';
import {
  convertMention,
  convertToAscii,
  stripHtmlValidation,
} from './strip.html.validation';

/**
 * PostActivity.postSocialBody runs this over every post body before handing it
 * to a provider, so it has the widest blast radius of any pure function here.
 */
describe('stripHtmlValidation', () => {
  it('returns the value untouched in plain mode', () => {
    expect(stripHtmlValidation('none', '<p>kept</p>', false, false, true)).toBe(
      '<p>kept</p>'
    );
  });

  it('strips every tag for editor type "none"', () => {
    expect(stripHtmlValidation('none', '<p>hello <strong>world</strong></p>')).toBe(
      'hello world'
    );
  });

  it('decodes entities back to their characters', () => {
    expect(
      stripHtmlValidation('none', '<p>a &gt; b &lt; c &amp; d &quot;e&quot; &#39;f&#39;</p>')
    ).toBe('a > b < c & d "e" \'f\'');
  });

  it('keeps a safe subset of tags for editor type "html"', () => {
    const result = stripHtmlValidation('html', '<p>keep</p><script>drop()</script>');

    expect(result).toContain('<p>keep</p>');
    expect(result).not.toContain('script');
  });

  it('converts headings to markdown for editor type "markdown"', () => {
    expect(stripHtmlValidation('markdown', '<h1>Title</h1>')).toContain('# Title');
  });

  it('renders bold as unicode for the normal editor', () => {
    // The bold branch sits after the none/html/markdown early returns, so it
    // only applies to the "normal" editor - the platforms with no rich text.
    expect(stripHtmlValidation('normal', '<p><strong>Hi</strong></p>', true)).toBe(
      '𝗛𝗶'
    );
  });

  it('renders underline as unicode for the normal editor', () => {
    expect(stripHtmlValidation('normal', '<p><u>ab</u></p>', true)).toBe('a̲b̲');
  });

  it('leaves ordinary text alone when bold replacement is on', () => {
    expect(stripHtmlValidation('normal', '<p>plain</p>', true)).toBe('plain');
  });
});

describe('convertMention', () => {
  it('formats a mention through the provider callback', () => {
    const format = vi.fn(
      (id: string, name: string) => `@${name}(${id})`
    );

    const result = convertMention(
      '<span data-mention-id="urn:li:organization:1">Acme</span>',
      format
    );

    expect(format).toHaveBeenCalledWith('urn:li:organization:1', 'Acme');
    expect(result).toContain('@Acme(urn:li:organization:1)');
  });

  it('returns the value unchanged when the provider has no formatter', () => {
    const value = '<span data-mention-id="urn:li:organization:1">Acme</span>';

    expect(convertMention(value, undefined)).toBe(value);
  });
});

describe('convertToAscii', () => {
  it('is a pure string transform that never throws', () => {
    for (const input of ['', 'plain', '𝗯𝗼𝗹𝗱', 'a̲b̲']) {
      expect(typeof convertToAscii(input)).toBe('string');
    }
  });
});
