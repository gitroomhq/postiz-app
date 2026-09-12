import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFormatting } from './use.formatting';

type Value = Parameters<typeof useFormatting>[0][number];
type Params = Parameters<typeof useFormatting>[1];

const format = (text: Value[], params: Params = {}) =>
  renderHook(({ t, p }) => useFormatting(t, p), {
    initialProps: { t: text, p: params },
  });

const first = (text: Value[], params: Params = {}) =>
  format(text, params).result.current[0];

const content = (value: string, over: Partial<Value> = {}): Value => ({
  content: value,
  ...over,
});

describe('useFormatting mentions', () => {
  it('bolds an @mention', () => {
    expect(first([content('hello @jack')]).text).toBe(
      'hello <strong>@jack</strong>'
    );
  });

  it('bolds every mention in the text', () => {
    expect(first([content('@a and @b and @c')]).text).toBe(
      '<strong>@a</strong> and <strong>@b</strong> and <strong>@c</strong>'
    );
  });

  it('stops a mention at 15 characters, matching the handle limit', () => {
    const long = 'a'.repeat(20);

    expect(first([content(`@${long}`)]).text).toBe(
      `<strong>@${'a'.repeat(15)}</strong>${'a'.repeat(5)}`
    );
  });

  it.each([
    ['a bare @', 'email me @ work'],
    ['an email address', 'hi a@b.com'],
  ])('leaves %s partly alone', (_label, input) => {
    // The pattern is deliberately loose - it is a preview affordance, not a
    // parser - so this pins what it actually does rather than what it ought to.
    expect(first([content(input)]).text).toBe(
      input.replace(/@\w{1,15}/g, (m) => `<strong>${m}</strong>`)
    );
  });

  it('passes plain text through unchanged', () => {
    expect(first([content('nothing to see here')]).text).toBe(
      'nothing to see here'
    );
  });

  it('handles an empty string', () => {
    expect(first([content('')]).text).toBe('');
  });
});

describe('useFormatting saveBreaklines', () => {
  it('keeps a newline intact when asked to', () => {
    expect(first([content('a\nb')], { saveBreaklines: true }).text).toBe('a\nb');
  });

  it('only protects the first newline, not every one', () => {
    // The guard uses String.replace with a string needle and no /g, so the
    // second newline onwards never round-trips through the sentinel. It
    // survives here only because the mention pattern does not touch newlines -
    // pinned so a change to that pattern surfaces as a failure here.
    expect(first([content('a\nb\nc')], { saveBreaklines: true }).text).toBe(
      'a\nb\nc'
    );
  });

  it('leaves the sentinel nowhere in the output', () => {
    const result = first([content('a\nb\nc')], { saveBreaklines: true }).text;

    expect(result).not.toContain('𝔫𝔢𝔴𝔩𝔦𝔫𝔢');
  });

  it('still bolds mentions across newlines', () => {
    expect(first([content('@jack\n@jill')], { saveBreaklines: true }).text).toBe(
      '<strong>@jack</strong>\n<strong>@jill</strong>'
    );
  });
});

describe('useFormatting count', () => {
  it('counts the formatted text, markup included', () => {
    const result = first([content('hi @jack')]);

    expect(result.count).toBe(result.text.length);
  });

  it('counts a newline as one character by default', () => {
    expect(first([content('a\nb')], { saveBreaklines: true }).count).toBe(3);
  });

  it('counts newlines as spaces only when both flags are set', () => {
    // removeMarkdown alone does nothing to the count; it is the pair that
    // switches to the "newline is a space" rule.
    const both = first([content('a\nb')], {
      saveBreaklines: true,
      removeMarkdown: true,
    });
    const onlyRemove = first([content('a\nb')], { removeMarkdown: true });

    expect(both.count).toBe(3);
    expect(onlyRemove.count).toBe(3);
  });
});

describe('useFormatting hooks and passthrough', () => {
  it('runs beforeSpecialFunc ahead of the mention pass', () => {
    const result = first([content('name')], {
      beforeSpecialFunc: (t) => `@${t}`,
    });

    expect(result.text).toBe('<strong>@name</strong>');
  });

  it('runs specialFunc after everything else', () => {
    const specialFunc = vi.fn((t: string) => `[${t}]`);

    expect(first([content('@jack')], { specialFunc }).text).toBe(
      '[<strong>@jack</strong>]'
    );
    expect(specialFunc).toHaveBeenCalledWith('<strong>@jack</strong>');
  });

  it('carries id and images through untouched', () => {
    const image = [{ id: 'img-1', path: 'https://cdn.test/a.png' }];

    expect(first([content('hi', { id: 'v-1', image })])).toMatchObject({
      id: 'v-1',
      images: image,
    });
  });

  it('formats every entry of the list', () => {
    const { result } = format([content('@a'), content('@b')]);

    expect(result.current.map((r) => r.text)).toEqual([
      '<strong>@a</strong>',
      '<strong>@b</strong>',
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(format([]).result.current).toEqual([]);
  });

  it('recomputes when the text changes', () => {
    const { result, rerender } = format([content('@a')]);

    rerender({ t: [content('@b')], p: {} });

    expect(result.current[0].text).toBe('<strong>@b</strong>');
  });

  it('does not recompute when only the params change', () => {
    // The memo depends on [text] alone, so a caller that swaps specialFunc
    // without touching the text keeps the previous output. Pinned because it
    // reads like a bug at the call site and is easy to "fix" into a render loop.
    const text = [content('a\nb')];
    const { result, rerender } = format(text, {});
    const before = result.current;

    rerender({ t: text, p: { specialFunc: (t: string) => `[${t}]` } });

    expect(result.current).toBe(before);
  });
});
