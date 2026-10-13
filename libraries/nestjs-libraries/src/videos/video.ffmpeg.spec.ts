import { escapeDrawtext, ffmpegPlan } from './video.ffmpeg';
import { VideoEdit } from './video.edit';

const edit: VideoEdit = {
  clips: [
    { mediaId: 'a', in: 1, out: 4, muted: false },
    { mediaId: 'b', in: 0, out: 2, muted: true },
  ],
  titles: [
    {
      text: "It's 50%",
      start: 0.5,
      end: 2,
      x: 0.5,
      y: 0.5,
      font: 'Inter',
      size: 48,
      color: '#ffffff',
      align: 'center',
    },
  ],
  music: { mediaId: 'm', in: 3, start: 1, volume: 25 },
  shape: '9:16',
  focusX: 0,
  focusY: 1,
};

const clip = (path: string, hasAudio: boolean) => ({
  path,
  width: 1920,
  height: 1080,
  duration: 20,
  fps: 30,
  hasAudio,
});

describe('ffmpegPlan', () => {
  const plan = ffmpegPlan(
    {
      edit,
      clips: [clip('/tmp/a.mp4', true), clip('/tmp/b.mov', true)],
      music: clip('/tmp/song.mp3', true),
      width: 1080,
      height: 1920,
    },
    ['/tmp/title.png']
  );

  it('reads every source and writes an h264 mp4 with faststart', () => {
    expect(plan.inputs.map((input) => input.path)).toEqual([
      '/tmp/a.mp4',
      '/tmp/b.mov',
      '/tmp/title.png',
      '/tmp/song.mp3',
    ]);
    expect(plan.output).toEqual(
      expect.arrayContaining(['libx264', 'high', 'yuv420p', 'aac', '128k', '+faststart'])
    );
  });

  it('crops to the frame, silences a muted clip, and mixes the music under the video', () => {
    expect(plan.filter).toContain('scale=1080:1920:force_original_aspect_ratio=increase');
    expect(plan.filter).toContain('crop=1080:1920:(iw-1080)*0:(ih-1920)*1');
    expect(plan.filter).toContain('trim=start=1:end=4');
    expect(plan.filter).toContain('anullsrc=channel_layout=stereo:sample_rate=48000,atrim=0:2');
    expect(plan.filter).toContain("overlay=0:0:enable='between(t,0.5,2)'");
    expect(plan.inputs[2].duration).toBe(5);
    expect(plan.filter).toContain('volume=0.25');
    expect(plan.filter).toContain('amix=inputs=2:duration=first:dropout_transition=0:normalize=0');
  });
});

describe('escapeDrawtext', () => {
  it('escapes the characters drawtext treats as syntax', () => {
    expect(escapeDrawtext("a:b\\c%")).toBe("a\\:b\\\\c\\%");
  });
});
