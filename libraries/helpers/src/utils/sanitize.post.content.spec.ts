// isomorphic-dompurify binds dompurify to a jsdom window, but the jsdom copy it
// nests is published as esm only and jest cannot load it. This does the same
// binding with the jsdom that jest does load, the sanitizer itself is real.
jest.mock('isomorphic-dompurify', () => {
  const jsdom = jest.requireActual('jsdom') as any;
  const createDOMPurify = jest.requireActual('dompurify') as any;

  return {
    __esModule: true,
    default: createDOMPurify(new jsdom.JSDOM('<!DOCTYPE html>').window),
  };
});

import {
  postContentPlainText,
  sanitizePostContent,
} from './sanitize.post.content';

describe('sanitizePostContent', () => {
  it('keeps the tags a post is allowed to use', () => {
    expect(sanitizePostContent('<p>hello <strong>world</strong></p>')).toBe(
      '<p>hello <strong>world</strong></p>'
    );
  });

  it('drops a script tag and its content', () => {
    expect(sanitizePostContent('<p>hi</p><script>alert(1)</script>')).toBe(
      '<p>hi</p>'
    );
  });

  it('drops event handler attributes', () => {
    expect(sanitizePostContent('<p onclick="alert(1)">hi</p>')).toBe('<p>hi</p>');
  });

  it('drops a javascript url', () => {
    expect(sanitizePostContent('<a href="javascript:alert(1)">hi</a>')).toBe(
      '<a>hi</a>'
    );
  });

  it('drops an iframe', () => {
    expect(sanitizePostContent('<iframe src="https://evil.com"></iframe>')).toBe(
      ''
    );
  });

  it('keeps only the fields a post mentions its users with', () => {
    expect(
      sanitizePostContent(
        '<span data-mention-id="1" data-mention-label="bob" style="color:red">bob</span>'
      )
    ).toBe('<span data-mention-id="1" data-mention-label="bob">bob</span>');
  });

  it('drops an image that does not point to a real file', () => {
    expect(
      sanitizePostContent('<img src="data:image/png;base64,AAAA">')
    ).toBe('');
  });

  it('keeps an image served over http', () => {
    expect(
      sanitizePostContent('<img src="https://postiz.com/a.png" alt="a">')
    ).toBe('<img src="https://postiz.com/a.png" alt="a">');
  });

  it('returns an empty string for empty and non string values', () => {
    expect(sanitizePostContent('')).toBe('');
    expect(sanitizePostContent(undefined)).toBe('');
    expect(sanitizePostContent({ content: '<p>hi</p>' })).toBe('');
  });
});

describe('postContentPlainText', () => {
  it('decodes entities, this is what anchor offsets index into', () => {
    expect(postContentPlainText('<p>a &amp; b</p>')).toBe('a & b');
  });

  it('joins the blocks without adding separators', () => {
    expect(postContentPlainText('<p>one</p><p>two</p>')).toBe('onetwo');
  });

  it('does not return sanitized markup', () => {
    expect(postContentPlainText('<p>hi</p><script>alert(1)</script>')).toBe(
      'hi'
    );
  });

  it('returns an empty string for empty and missing values', () => {
    expect(postContentPlainText('')).toBe('');
    expect(postContentPlainText(null)).toBe('');
  });
});
