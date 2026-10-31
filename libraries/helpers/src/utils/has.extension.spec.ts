import { describe, expect, it } from 'vitest';
import { hasExtension } from './has.extension';

describe('hasExtension', () => {
  it('returns false for null and undefined paths', () => {
    expect(hasExtension(null, 'png')).toBe(false);
    expect(hasExtension(undefined, 'png')).toBe(false);
    expect(hasExtension('', 'png')).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(hasExtension('/uploads/IMAGE.PNG', 'png')).toBe(true);
    expect(hasExtension('/uploads/image.png', 'PNG')).toBe(true);
  });

  it('accepts the extension with or without a leading dot', () => {
    expect(hasExtension('/uploads/image.png', '.png')).toBe(true);
    expect(hasExtension('/uploads/image.png', 'png')).toBe(true);
  });

  it('returns false when the extension is absent', () => {
    expect(hasExtension('/uploads/image.jpg', 'png')).toBe(false);
  });

  it('matches anywhere in the path, not only at the end', () => {
    // Characterisation, not endorsement: the implementation uses indexOf rather
    // than endsWith, so a directory named ".png" counts as a match. Pinned so
    // that switching to endsWith is a deliberate change with a failing test.
    expect(hasExtension('/uploads/.png/photo.jpg', 'png')).toBe(true);
  });
});
