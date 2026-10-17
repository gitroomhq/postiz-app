import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoOrImage } from './video.or.image';

const renderSrc = (src: string, props: Record<string, unknown> = {}) =>
  render(<VideoOrImage src={src} autoplay={false} {...props} />).container;

describe('VideoOrImage', () => {
  it.each([
    'https://cdn.test/clip.mp4',
    'https://cdn.test/clip.MP4',
    '/uploads/clip.mp4',
    'https://cdn.test/clip.mp4?v=2',
  ])('renders %s as a video', (src) => {
    const container = renderSrc(src);

    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it.each([
    'https://cdn.test/photo.png',
    'https://cdn.test/photo.jpg',
    'https://cdn.test/photo.webp',
    'https://cdn.test/mp4.png',
    'https://cdn.test/no-extension',
  ])('renders %s as an image', (src) => {
    const container = renderSrc(src);

    expect(container.querySelector('img')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('always mutes and loops a video, so a feed of them is bearable', () => {
    const video = renderSrc('https://cdn.test/clip.mp4').querySelector('video')!;

    expect(video).toHaveProperty('muted', true);
    expect(video).toHaveAttribute('loop');
  });

  it('passes autoplay through', () => {
    const on = renderSrc('https://cdn.test/a.mp4', { autoplay: true });
    const off = renderSrc('https://cdn.test/a.mp4', { autoplay: false });

    expect(on.querySelector('video')).toHaveAttribute('autoplay');
    expect(off.querySelector('video')).not.toHaveAttribute('autoplay');
  });

  it('fills its container in both branches', () => {
    expect(renderSrc('https://cdn.test/a.mp4').querySelector('video')).toHaveClass(
      'w-full',
      'h-full'
    );
    expect(renderSrc('https://cdn.test/a.png').querySelector('img')).toHaveClass(
      'w-full',
      'h-full'
    );
  });

  it('covers by default and contains when asked', () => {
    expect(renderSrc('https://cdn.test/a.png').querySelector('img')).toHaveClass(
      'object-cover'
    );
    expect(
      renderSrc('https://cdn.test/a.png', { isContain: true }).querySelector('img')
    ).toHaveClass('object-contain');
  });

  it('appends the caller class without dropping its own', () => {
    const img = renderSrc('https://cdn.test/a.png', {
      imageClassName: 'rounded',
    }).querySelector('img')!;

    expect(img).toHaveClass('rounded', 'w-full', 'object-cover');
  });

  it('applies videoClassName only to a video, and imageClassName only to an image', () => {
    const video = renderSrc('https://cdn.test/a.mp4', {
      videoClassName: 'vid',
      imageClassName: 'pic',
    }).querySelector('video')!;

    expect(video).toHaveClass('vid');
    expect(video).not.toHaveClass('pic');
  });

  it('sets the src on whichever element it chose', () => {
    expect(
      renderSrc('https://cdn.test/a.mp4').querySelector('video')
    ).toHaveAttribute('src', 'https://cdn.test/a.mp4');
    expect(
      renderSrc('https://cdn.test/a.png').querySelector('img')
    ).toHaveAttribute('src', 'https://cdn.test/a.png');
  });
});
