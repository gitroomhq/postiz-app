import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);
const css = readFileSync(
  fileURLToPath(new URL('../../app/global.css', import.meta.url)),
  'utf8',
);
const repo = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts',
      import.meta.url,
    ),
  ),
  'utf8',
);

const isVideoPath = (path: string) =>
  path.toLowerCase().includes('.mp4') || /\.webm$/i.test(path);

function firstCalendarMedia(image: unknown): {
  src: string;
  video: boolean;
} | null {
  let list: unknown = image;
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (!trimmed || trimmed === '[]' || trimmed === 'null') return null;
    try {
      list = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list.find(
    (item): item is { path?: string; thumbnail?: string } =>
      !!item && typeof item === 'object',
  );
  const path = typeof first?.path === 'string' ? first.path : '';
  if (!path) return null;
  const video = isVideoPath(path);
  const thumb =
    typeof first.thumbnail === 'string' && first.thumbnail
      ? first.thumbnail
      : '';
  return { src: video && thumb ? thumb : path, video };
}

describe('calendar media thumbs', () => {
  it('reads the first image or video off Post.image without an empty hole', () => {
    assert.equal(firstCalendarMedia(undefined), null);
    assert.equal(firstCalendarMedia(''), null);
    assert.equal(firstCalendarMedia('[]'), null);
    assert.equal(firstCalendarMedia('not-json'), null);
    assert.equal(firstCalendarMedia([{ id: 'x' }]), null);
    assert.deepEqual(firstCalendarMedia('[{"path":"/a.jpg"}]'), {
      src: '/a.jpg',
      video: false,
    });
    assert.deepEqual(
      firstCalendarMedia([{ path: '/clip.mp4', thumbnail: '/poster.jpg' }]),
      { src: '/poster.jpg', video: true },
    );
    assert.deepEqual(firstCalendarMedia([{ path: '/clip.mp4' }]), {
      src: '/clip.mp4',
      video: true,
    });
    assert.match(calendar, /export function firstCalendarMedia/);
    assert.match(calendar, /if \(!media\) return null/);
  });

  it('draws a square thumb on week, month, and day cards', () => {
    assert.match(calendar, /data-ci-media=\{size\}/);
    assert.match(calendar, /size="week"/);
    assert.match(calendar, /size="month"/);
    assert.match(calendar, /size="day"/);
    assert.match(css, /\[data-ci-media='week'\]/);
    assert.match(css, /\[data-ci-media='month'\]/);
    assert.match(css, /\[data-ci-media='day'\]/);
    assert.match(css, /width: 18px/);
    assert.match(css, /width: 56px/);
  });

  it('marks video with a play overlay and prefers the poster', () => {
    assert.match(calendar, /data-ci-media-play="1"/);
    assert.match(calendar, /d="M9 6\.8v10\.4L18 12 9 6\.8Z"/);
    assert.match(calendar, /src: video && thumb \? thumb : path/);
  });

  it('grows the same thumb ~2× in place on fine-pointer hover, not on touch', () => {
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
    assert.match(css, /--ci-media-scale: 2/);
    assert.match(css, /transform: scale\(var\(--ci-media-scale, 2\)\)/);
    assert.doesNotMatch(css, /--ci-media-scale: 5/);
    assert.match(css, /transform-origin: center right/);
    assert.match(css, /\[dir='rtl'\] \[data-ci-media\]/);
    assert.match(css, /transform-origin: center left/);
    assert.match(css, /box-shadow: var\(--e2\)/);
    assert.match(css, /border-radius: var\(--r-md\)/);
    assert.match(
      css,
      /\[data-mobile='1'\] \[data-ci\]:hover \[data-ci-media\]/,
    );
    assert.match(
      css,
      /\[data-tablet='1'\] \[data-ci\]:hover \[data-ci-media\]/,
    );
    assert.match(css, /transform: none/);
    assert.doesNotMatch(calendar, /onClick=\{[^}]*media/);
  });

  it('selects the existing image column on calendar and list payloads', () => {
    assert.match(repo, /minify already passes unmapped keys through as `image`/);
    const getPosts = repo.slice(repo.indexOf('async getPosts('));
    const getPostsSelect = getPosts.slice(
      getPosts.indexOf('select: {'),
      getPosts.indexOf('return list.reduce'),
    );
    assert.match(getPostsSelect, /image: true/);
    const list = repo.slice(repo.indexOf('async getPostsList('));
    const listSelect = list.slice(
      list.indexOf('select: {'),
      list.indexOf('this._post.model.post.count'),
    );
    assert.match(listSelect, /image: true/);
  });
});
