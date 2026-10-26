import { Mark, mergeAttributes } from '@tiptap/react';

// A Telegram spoiler: the text stays hidden until the reader taps it. The
// editor keeps it as a span the sanitizer lets through, the Telegram provider
// turns it into Telegram's own <tg-spoiler> tag.
export const Spoiler = Mark.create({
  name: 'spoiler',

  parseHTML() {
    return [{ tag: 'span.tg-spoiler' }, { tag: 'tg-spoiler' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'tg-spoiler' }),
      0,
    ];
  },
});
