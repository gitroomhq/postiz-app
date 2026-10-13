export const VIDEO_EDIT_MAX_SECONDS = 900;
export const VIDEO_EDIT_MIN_CLIP = 0.1;
export const VIDEO_EDIT_MAX_OVERLAYS = 40;
export const VIDEO_RATIOS = ['1:1', '4:5', '9:16', '16:9'] as const;

export type VideoRatio = (typeof VIDEO_RATIOS)[number];

export interface VideoEditClip {
  mediaId: string;
  in: number;
  out: number;
  muted: boolean;
}

// a full-frame picture drawn in the browser, shown between start and end;
// path is set by the server from the uploaded file, never read from the body
export interface VideoEditOverlay {
  start: number;
  end: number;
  path: string;
}

export interface VideoEditMusic {
  mediaId: string;
  in: number;
  start: number;
  volume: number;
}

export interface VideoEdit {
  clips: VideoEditClip[];
  overlays: VideoEditOverlay[];
  music?: VideoEditMusic;
  shape: 'original' | VideoRatio;
  focusX: number;
  focusY: number;
}

const number = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : undefined;

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

// Turns the request body into an edit, or a reason it cannot be rendered
// overlay paths are attached by the caller once the uploaded files are stored
export const parseVideoEdit = (
  body: any,
  overlayPaths: string[] = []
): { edit: VideoEdit } | { error: string } => {
  const clips = Array.isArray(body?.clips) ? body.clips : [];
  if (!clips.length || clips.length > 30) {
    return { error: 'Add between 1 and 30 clips' };
  }
  const parsedClips: VideoEditClip[] = [];
  for (const clip of clips) {
    const mediaId = text(clip?.mediaId);
    const start = number(clip?.in, 0, Number.MAX_SAFE_INTEGER);
    const end = number(clip?.out, 0, Number.MAX_SAFE_INTEGER);
    if (!mediaId || start === undefined || end === undefined) {
      return { error: 'A clip is missing its file or its timing' };
    }
    if (end < start + VIDEO_EDIT_MIN_CLIP) {
      return { error: 'A clip is shorter than 0.1 seconds' };
    }
    parsedClips.push({
      mediaId,
      in: start,
      out: end,
      muted: !!clip?.muted,
    });
  }
  const duration = parsedClips.reduce((sum, clip) => sum + (clip.out - clip.in), 0);
  if (duration > VIDEO_EDIT_MAX_SECONDS) {
    return { error: 'The edit is longer than 15 minutes' };
  }

  const overlays = Array.isArray(body?.overlays) ? body.overlays : [];
  if (overlays.length > VIDEO_EDIT_MAX_OVERLAYS) {
    return { error: `Use at most ${VIDEO_EDIT_MAX_OVERLAYS} layers` };
  }
  const parsedOverlays: Omit<VideoEditOverlay, 'path'>[] = [];
  for (const overlay of overlays) {
    const start = number(overlay?.start, 0, duration);
    const end = number(overlay?.end, 0, duration);
    if (start === undefined || end === undefined || end <= start) {
      return { error: 'A layer has timing outside the video' };
    }
    parsedOverlays.push({ start, end });
  }

  let music: VideoEditMusic | undefined;
  if (body?.music) {
    const mediaId = text(body.music.mediaId);
    const start = number(body.music.in, 0, VIDEO_EDIT_MAX_SECONDS);
    const at = number(body.music.start, 0, duration);
    const volume = number(body.music.volume, 0, 100);
    if (!mediaId || start === undefined || at === undefined || volume === undefined) {
      return { error: 'The music track is missing its file or its timing' };
    }
    music = { mediaId, in: start, start: at, volume: Math.round(volume) };
  }

  if (overlayPaths.length !== parsedOverlays.length) {
    return { error: 'Every layer needs its picture' };
  }

  const shape = body?.shape === undefined ? 'original' : body.shape;
  if (shape !== 'original' && !VIDEO_RATIOS.includes(shape)) {
    return { error: 'Choose a frame size' };
  }
  const focusX = number(body?.focusX, 0, 1) ?? 0.5;
  const focusY = number(body?.focusY, 0, 1) ?? 0.5;

  return {
    edit: {
      clips: parsedClips,
      overlays: parsedOverlays.map((overlay, index) => ({
        ...overlay,
        path: overlayPaths[index],
      })),
      ...(music ? { music } : {}),
      shape,
      focusX,
      focusY,
    },
  };
};

export const editDuration = (edit: VideoEdit) =>
  edit.clips.reduce((sum, clip) => sum + (clip.out - clip.in), 0);

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

const RATIO_SIZE: Record<VideoRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

// Original keeps the first clip's aspect and only shrinks when it is too big
export const frameSize = (
  shape: VideoEdit['shape'],
  source: { width: number; height: number }
) => {
  if (shape !== 'original') {
    return RATIO_SIZE[shape];
  }
  const { width, height } = source;
  if (!(width > 0) || !(height > 0)) {
    return { width: 1080, height: 1080 };
  }
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const scale = Math.min(1, 1080 / short, 1920 / long);
  return { width: even(width * scale), height: even(height * scale) };
};
