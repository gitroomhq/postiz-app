'use client';

import {
  FC,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  VIDEO_EDIT_MAX_SECONDS,
  VIDEO_FONTS,
  VIDEO_RATIOS,
  VideoAlign,
  VideoFont,
  VideoRatio,
} from '@gitroom/nestjs-libraries/videos/video.edit';
import {
  Field,
  ToolButton,
} from '@gitroom/frontend/components/media/editor/media.editor.ui';

const MIN_CLIP = 0.1;
const PX = 48;
const FRAME: Record<VideoRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
};

interface Source {
  id: string;
  path: string;
  name: string;
}

interface Clip {
  key: string;
  mediaId: string;
  path: string;
  name: string;
  in: number;
  out: number;
  muted: boolean;
  duration: number;
  width: number;
  height: number;
  unplayable: boolean;
  tone: number;
  fps?: number;
}

interface Title {
  key: string;
  text: string;
  start: number;
  end: number;
  x: number;
  y: number;
  font: VideoFont;
  size: number;
  color: string;
  align: VideoAlign;
}

interface Music {
  mediaId: string;
  path: string;
  name: string;
  in: number;
  start: number;
  volume: number;
  duration: number;
}

interface Doc {
  clips: Clip[];
  titles: Title[];
  music?: Music;
  shape: 'original' | VideoRatio;
  focusX: number;
  focusY: number;
}

const CLIP_COLORS = ['#612BD3', '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#2563EB', '#0891B2', '#4F46E5'];

const clipColor = (tone: number) => `${CLIP_COLORS[Math.abs(tone) % CLIP_COLORS.length]}b3`;

const frameRate = (fps?: number) => Math.min(60, Math.max(1, Math.round(fps || 30)));

const formatTime = (seconds: number, fps: number) => {
  const rate = frameRate(fps);
  const totalFrames = Math.max(0, Math.round(Math.max(0, seconds) * rate));
  const frames = totalFrames % rate;
  const whole = Math.floor(totalFrames / rate);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
};

const span = (clip: Clip) => clip.out - clip.in;

const placedClips = (clips: Clip[]) => {
  let at = 0;
  return clips.map((clip) => {
    const start = at;
    at += span(clip);
    return { ...clip, start };
  });
};

const totalOf = (clips: Clip[]) => clips.reduce((sum, clip) => sum + span(clip), 0);

const MediaVideoEditor: FC<{
  media: Source;
  closeModal: () => void;
  onSaved: () => void;
}> = ({ media, closeModal, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const mediaDirectory = useMediaDirectory();
  const [doc, setDoc] = useState<Doc>({
    clips: [
      {
        key: makeId(8),
        mediaId: media.id,
        path: media.path,
        name: media.name || 'video',
        in: 0,
        out: 1,
        muted: false,
        duration: 1,
        width: 1920,
        height: 1080,
        unplayable: false,
        tone: 0,
      },
    ],
    titles: [],
    shape: 'original',
    focusX: 0.5,
    focusY: 0.5,
  });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedClip, setSelectedClip] = useState(doc.clips[0].key);
  const [selectedTitle, setSelectedTitle] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);
  const history = useRef<Doc[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playingRef = useRef(false);
  const playheadRef = useRef(0);
  const totalRef = useRef(0);
  const fpsRef = useRef(30);
  const fpsRequested = useRef(new Set<string>());
  const docRef = useRef(doc);
  docRef.current = doc;
  playingRef.current = playing;

  const placed = useMemo(() => placedClips(doc.clips), [doc.clips]);
  const total = totalOf(doc.clips);
  const timelineFps = frameRate(doc.clips[0]?.fps);
  playheadRef.current = playhead;
  totalRef.current = total;
  fpsRef.current = timelineFps;
  const active = placed.find((clip) => playhead < clip.start + span(clip)) || placed[placed.length - 1];
  const frame =
    doc.shape === 'original'
      ? { width: doc.clips[0]?.width || 1920, height: doc.clips[0]?.height || 1080 }
      : FRAME[doc.shape];

  const remember = () => {
    history.current = [...history.current.slice(-49), docRef.current];
    setCanUndo(true);
  };
  const undo = () => {
    const previous = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (previous) {
      setDoc(previous);
    }
  };

  const readSource = async (source: Source, clip: Clip) => {
    const video = videos.current[clip.key];
    if (video && video.duration) {
      return {
        duration: video.duration,
        width: video.videoWidth || clip.width,
        height: video.videoHeight || clip.height,
        unplayable: false,
      };
    }
    const response = await fetch(`/media/${source.id}/probe`);
    if (!response.ok) {
      return { duration: clip.duration, width: clip.width, height: clip.height, unplayable: true };
    }
    const probed = await response.json();
    return {
      duration: probed.duration || clip.duration,
      width: probed.width || clip.width,
      height: probed.height || clip.height,
      fps: probed.fps || clip.fps,
      unplayable: true,
    };
  };

  useEffect(() => {
    setPlayhead((value) => Math.min(value, total));
  }, [total]);

  useEffect(() => {
    const box = previewRef.current;
    if (!box) {
      return;
    }
    const measure = () => setPreviewWidth(box.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [frame.width, frame.height]);

  useEffect(() => {
    const missing = [
      ...new Set(doc.clips.filter((clip) => !clip.fps).map((clip) => clip.mediaId)),
    ].filter((id) => !fpsRequested.current.has(id));
    if (!missing.length) {
      return;
    }
    missing.forEach((id) => fpsRequested.current.add(id));
    let cancel = false;
    missing.forEach(async (id) => {
      const response = await fetch(`/media/${id}/probe`);
      if (cancel) {
        return;
      }
      if (!response.ok) {
        fpsRequested.current.delete(id);
        return;
      }
      const probed = await response.json().catch(() => ({}));
      const fps = Number(probed.fps);
      if (!(fps > 0)) {
        fpsRequested.current.delete(id);
        return;
      }
      setDoc((current) => ({
        ...current,
        clips: current.clips.map((clip) =>
          clip.mediaId === id && !clip.fps ? { ...clip, fps } : clip
        ),
      }));
    });
    return () => {
      cancel = true;
      missing.forEach((id) => fpsRequested.current.delete(id));
    };
  }, [doc.clips]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter&family=Montserrat&family=Poppins&family=Roboto&display=swap';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((value) => !value);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        playingRef.current = false;
        setPlaying(false);
        const rate = frameRate(fpsRef.current);
        const frame = Math.round(playheadRef.current * rate) + (e.key === 'ArrowRight' ? 1 : -1);
        const next = Math.max(0, Math.min(totalRef.current, frame / rate));
        playheadRef.current = next;
        setPlayhead(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!playing || !active) {
      Object.values(videos.current).forEach((video) => video?.pause());
      musicRef.current?.pause();
      return;
    }
    const video = videos.current[active.key];
    if (!video) {
      return;
    }
    Object.entries(videos.current).forEach(([key, node]) => {
      if (node && key !== active.key) {
        node.pause();
      }
    });
    const local = active.in + (playhead - active.start);
    if (Math.abs(video.currentTime - local) > 0.3) {
      video.currentTime = local;
    }
    video.play().catch(() => setPlaying(false));
    const music = doc.music;
    const audio = musicRef.current;
    if (music && audio && playhead >= music.start) {
      audio.volume = music.volume / 100;
      const at = music.in + (playhead - music.start);
      if (Math.abs(audio.currentTime - at) > 0.3) {
        audio.currentTime = at;
      }
      audio.play().catch(() => undefined);
    }
    let frameId = 0;
    const tick = () => {
      if (!playingRef.current) {
        return;
      }
      const now = videos.current[active.key];
      if (!now) {
        return;
      }
      const next = active.start + (now.currentTime - active.in);
      const musicNow = docRef.current.music;
      const audioNow = musicRef.current;
      if (musicNow && audioNow) {
        if (next >= musicNow.start) {
          audioNow.volume = musicNow.volume / 100;
          if (audioNow.paused) {
            audioNow.currentTime = musicNow.in + (next - musicNow.start);
            audioNow.play().catch(() => undefined);
          }
        } else {
          audioNow.pause();
        }
      }
      if (now.currentTime >= active.out - 0.04) {
        const following = placed.find((clip) => clip.start >= active.start + span(active) - 0.001);
        if (!following) {
          setPlayhead(total);
          setPlaying(false);
          return;
        }
        setPlayhead(following.start);
        return;
      }
      setPlayhead(Math.min(total, next));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, active?.key]);

  useEffect(() => {
    if (playing || !active) {
      return;
    }
    const video = videos.current[active.key];
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(active.out, active.in + Math.max(0, playhead - active.start));
    }
  }, [playhead, playing, active?.key]);

  const updateClip = (key: string, patch: Partial<Clip>) => {
    setDoc((current) => ({
      ...current,
      clips: current.clips.map((clip) => (clip.key === key ? { ...clip, ...patch } : clip)),
    }));
  };

  const onMetadata = (key: string) => {
    const video = videos.current[key];
    if (!video?.duration) {
      return;
    }
    setDoc((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        clip.key === key
          ? {
              ...clip,
              duration: video.duration,
              width: video.videoWidth || clip.width,
              height: video.videoHeight || clip.height,
              out: clip.out === 1 && clip.in === 0 ? video.duration : Math.min(clip.out, video.duration),
              unplayable: false,
            }
          : clip
      ),
    }));
  };

  const onUnplayable = async (clip: Clip) => {
    const probed = await readSource({ id: clip.mediaId, path: clip.path, name: clip.name }, clip);
    updateClip(clip.key, {
      ...probed,
      out: clip.out === 1 && clip.in === 0 ? probed.duration : Math.min(clip.out, probed.duration),
    });
  };

  const pick = (kind: 'video' | 'audio', onPick: (items: Source[]) => void) => {
    modals.openModal({
      title: kind === 'video' ? t('editor_add_clip', 'Add clip') : t('editor_music', 'Music'),
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      closeOnEscape: true,
      askClose: false,
      children: (close) => (
        <LibraryPick kind={kind} close={close} onPick={onPick} />
      ),
    });
  };

  const addClip = (source: Source) => {
    remember();
    const key = makeId(8);
    setDoc((current) => ({
      ...current,
      clips: [
        ...current.clips,
        {
          key,
          mediaId: source.id,
          path: source.path,
          name: source.name,
          in: 0,
          out: 1,
          muted: false,
          duration: 1,
          width: 1920,
          height: 1080,
          unplayable: false,
          tone: 0,
        },
      ],
    }));
    setSelectedClip(key);
  };

  const split = () => {
    if (!active) {
      return;
    }
    const local = playhead - active.start;
    if (local < MIN_CLIP || span(active) - local < MIN_CLIP) {
      return;
    }
    remember();
    const cut = active.in + local;
    setDoc((current) => {
      const tone = Math.max(...current.clips.map((clip) => clip.tone)) + 1;
      return {
        ...current,
        clips: current.clips.flatMap((clip) =>
          clip.key !== active.key
            ? [clip]
            : [
                { ...clip, out: cut },
                { ...clip, key: makeId(8), in: cut, tone },
              ]
        ),
      };
    });
  };

  const trim = (key: string, edge: 'in' | 'out', value: number) => {
    const clip = doc.clips.find((item) => item.key === key);
    if (!clip) {
      return;
    }
    if (edge === 'in') {
      updateClip(key, { in: Math.min(clip.out - MIN_CLIP, Math.max(0, value)) });
    } else {
      updateClip(key, { out: Math.max(clip.in + MIN_CLIP, Math.min(clip.duration, value)) });
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= doc.clips.length) {
      return;
    }
    remember();
    const next = [...doc.clips];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDoc({ ...doc, clips: next });
  };

  const addTitle = () => {
    remember();
    const key = makeId(8);
    const start = Math.min(playhead, Math.max(0, total - 1));
    setDoc((current) => ({
      ...current,
      titles: [
        ...current.titles,
        {
          key,
          text: t('editor_title', 'Title'),
          start,
          end: Math.min(total, start + 3),
          x: 0.5,
          y: 0.5,
          font: 'Inter',
          size: 64,
          color: '#ffffff',
          align: 'center',
        },
      ],
    }));
    setSelectedTitle(key);
  };

  const updateTitle = (key: string, patch: Partial<Title>) => {
    setDoc((current) => ({
      ...current,
      titles: current.titles.map((title) => (title.key === key ? { ...title, ...patch } : title)),
    }));
  };

  const uploadMusic = async (file: File) => {
    const body = new FormData();
    body.append('file', file, file.name);
    const response = await fetch('/media/upload-simple', { method: 'POST', body });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toaster.show(
        t('editor_music_failed', "Couldn't add this audio file"),
        'warning'
      );
      return;
    }
    remember();
    setDoc((current) => ({
      ...current,
      music: {
        mediaId: data.id,
        path: data.path,
        name: file.name,
        in: 0,
        start: 0,
        volume: 40,
        duration: 0,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/media/video-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips: doc.clips.map((clip) => ({
          mediaId: clip.mediaId,
          in: clip.in,
          out: clip.out,
          muted: clip.muted,
        })),
        titles: doc.titles
          .filter((title) => title.text.trim())
          .map(({ text, start, end, x, y, font, size, color, align }) => ({
            text,
            start,
            end,
            x,
            y,
            font,
            size,
            color,
            align,
          })),
        ...(doc.music
          ? {
              music: {
                mediaId: doc.music.mediaId,
                in: doc.music.in,
                start: doc.music.start,
                volume: doc.music.volume,
              },
            }
          : {}),
        shape: doc.shape,
        focusX: doc.focusX,
        focusY: doc.focusY,
      }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        toaster.show(message || t('editor_video_save_failed', "Couldn't save, please try again"), 'warning');
        return;
      }
      onSaved();
      modals.closeCurrent();
    } catch {
      toaster.show(t('editor_video_save_failed', "Couldn't save, please try again"), 'warning');
    } finally {
      setSaving(false);
    }
  };

  const title = doc.titles.find((item) => item.key === selectedTitle);
  const clip = doc.clips.find((item) => item.key === selectedClip);
  const tooLong = total > VIDEO_EDIT_MAX_SECONDS;

  const dragTitle = (event: ReactPointerEvent, item: Title) => {
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    let saved = false;
    const move = (e: PointerEvent) => {
      if (!saved) {
        saved = true;
        remember();
      }
      updateTitle(item.key, {
        x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
        y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    event.stopPropagation();
  };

  const dragFocus = (event: ReactPointerEvent) => {
    setSelectedTitle(undefined);
    if (doc.shape === 'original') {
      return;
    }
    const box = previewRef.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    let saved = false;
    const origin = { x: event.clientX, y: event.clientY, focusX: doc.focusX, focusY: doc.focusY };
    const move = (e: PointerEvent) => {
      if (!saved) {
        saved = true;
        remember();
      }
      setDoc((current) => ({
        ...current,
        focusX: Math.min(1, Math.max(0, origin.focusX - (e.clientX - origin.x) / box.width)),
        focusY: Math.min(1, Math.max(0, origin.focusY - (e.clientY - origin.y) / box.height)),
      }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const seekTo = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPlaying(false);
    setPlayhead(Math.max(0, Math.min(total, (clientX - rect.left) / PX)));
  };

  const dragPlayhead = (event: ReactPointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    seekTo(event.clientX);
    const move = (e: PointerEvent) => seekTo(e.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dragEdge = (key: string, edge: 'in' | 'out', event: ReactPointerEvent) => {
    event.stopPropagation();
    remember();
    const startX = event.clientX;
    const clipAt = doc.clips.find((item) => item.key === key);
    if (!clipAt) {
      return;
    }
    const initial = edge === 'in' ? clipAt.in : clipAt.out;
    const move = (e: PointerEvent) => {
      trim(key, edge, initial + (e.clientX - startX) / PX);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    event.stopPropagation();
  };

  return (
    <div className="flex flex-col gap-[12px] w-full h-full min-h-0">
      <div className="flex gap-[16px] flex-1 min-h-0 mobile:flex-col">
        <div className="flex-1 flex items-center justify-center rounded-[8px] bg-newBgColorInner p-[12px] min-h-[280px]">
          <div
            ref={previewRef}
            onPointerDown={dragFocus}
            className="relative bg-black max-h-full max-w-full overflow-hidden"
            style={{ aspectRatio: `${frame.width} / ${frame.height}`, height: '100%' }}
          >
            {doc.clips.map((item) => (
              <video
                key={item.key}
                ref={(node) => {
                  videos.current[item.key] = node;
                }}
                src={mediaDirectory.set(item.path)}
                muted={item.muted}
                playsInline
                preload="auto"
                onLoadedMetadata={() => onMetadata(item.key)}
                onError={() => onUnplayable(item)}
                className={clsx(
                  'absolute inset-0 w-full h-full object-cover',
                  active?.key === item.key ? 'block' : 'hidden'
                )}
                style={{
                  objectPosition:
                    doc.shape === 'original'
                      ? 'center'
                      : `${doc.focusX * 100}% ${doc.focusY * 100}%`,
                }}
              />
            ))}
            {active?.unplayable && (
              <div className="absolute inset-0 flex items-center justify-center text-center text-[13px] text-white p-[16px]">
                {t(
                  'editor_video_unplayable',
                  "This browser can't play this file. The timeline still works, and the saved MP4 will play."
                )}
              </div>
            )}
            {doc.titles
              .filter(
                (item) =>
                  item.key === selectedTitle ||
                  (playhead >= item.start && playhead <= item.end)
              )
              .map((item) => (
              <div
                key={item.key}
                onPointerDown={(event) => {
                  setSelectedTitle(item.key);
                  dragTitle(event, item);
                }}
                className={clsx(
                  'absolute whitespace-nowrap cursor-move',
                  selectedTitle === item.key && 'outline outline-1 outline-[#612BD3]'
                )}
                style={{
                  left: `${item.x * 100}%`,
                  top: `${item.y * 100}%`,
                  transform:
                    item.align === 'left'
                      ? 'translate(0, -50%)'
                      : item.align === 'right'
                      ? 'translate(-100%, -50%)'
                      : 'translate(-50%, -50%)',
                  fontFamily: item.font,
                  fontSize: Math.max(
                    12,
                    (item.size * (previewWidth || frame.width)) / frame.width
                  ),
                  color: item.color,
                }}
              >
                {item.text}
              </div>
            ))}
          </div>
        </div>
        <div className="w-[300px] mobile:w-full flex flex-col gap-[12px] overflow-y-auto">
          <div className="flex flex-wrap gap-[6px]">
            <ToolButton icon={playing ? 'close' : 'select'} onClick={() => setPlaying((value) => !value)}>
              {playing ? t('editor_pause', 'Pause') : t('editor_play', 'Play')}
            </ToolButton>
            <ToolButton icon="split" onClick={split}>
              {t('editor_split', 'Split')}
            </ToolButton>
            <ToolButton icon="undo" disabled={!canUndo} onClick={undo}>
              {t('editor_undo', 'Undo')}
            </ToolButton>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {(
              [
                ['original', t('editor_original', 'Original')],
                ...VIDEO_RATIOS.map((ratio) => [ratio, ratio] as const),
              ] as const
            ).map(([shape, label]) => (
              <ToolButton
                key={shape}
                active={doc.shape === shape}
                onClick={() => {
                  remember();
                  setDoc({ ...doc, shape });
                }}
              >
                {label}
              </ToolButton>
            ))}
          </div>
          {clip && (
            <Field label={clip.name}>
              <div className="flex flex-wrap gap-[6px]">
                <ToolButton
                  icon="volume"
                  active={clip.muted}
                  onClick={() => {
                    remember();
                    updateClip(clip.key, { muted: !clip.muted });
                  }}
                >
                  {clip.muted ? t('editor_muted', 'Muted') : t('editor_mute', 'Mute')}
                </ToolButton>
                <ToolButton
                  icon="trash"
                  disabled={doc.clips.length < 2}
                  onClick={() => {
                    remember();
                    setDoc({ ...doc, clips: doc.clips.filter((item) => item.key !== clip.key) });
                  }}
                >
                  {t('editor_delete_clip', 'Delete clip')}
                </ToolButton>
              </div>
            </Field>
          )}
          <div className="flex flex-wrap gap-[6px]">
            <ToolButton icon="text" onClick={addTitle}>
              {t('editor_add_title', 'Add title')}
            </ToolButton>
            <ToolButton icon="image" onClick={() => pick('video', (items) => items[0] && addClip(items[0]))}>
              {t('editor_add_clip', 'Add clip')}
            </ToolButton>
          </div>
          {title && (
            <Field label={t('editor_title', 'Title')}>
              <div className="flex flex-col gap-[8px]">
                <input
                  className="h-[36px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[13px] outline-none"
                  value={title.text}
                  onFocus={() => remember()}
                  onChange={(e) => updateTitle(title.key, { text: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-[6px]">
                  <label className="text-[12px]">
                    {t('editor_size', 'Size')}
                    <input
                      type="number"
                      min={8}
                      max={500}
                      value={title.size}
                      className="h-[36px] w-full px-[8px] rounded-[8px] bg-newBgColorInner border border-newColColor"
                      onFocus={() => remember()}
                      onChange={(e) =>
                        updateTitle(title.key, {
                          size: Math.min(500, Math.max(8, Number(e.target.value) || 8)),
                        })
                      }
                    />
                  </label>
                  <label className="text-[12px]">
                    {t('editor_from', 'From')}
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(title.start.toFixed(1))}
                      className="h-[36px] w-full px-[8px] rounded-[8px] bg-newBgColorInner border border-newColColor"
                      onFocus={() => remember()}
                      onChange={(e) => {
                        const start = Math.max(0, Number(e.target.value) || 0);
                        updateTitle(title.key, {
                          start,
                          end: Math.max(title.end, start + 0.1),
                        });
                      }}
                    />
                  </label>
                  <label className="text-[12px]">
                    {t('editor_to', 'To')}
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(title.end.toFixed(1))}
                      className="h-[36px] w-full px-[8px] rounded-[8px] bg-newBgColorInner border border-newColColor"
                      onFocus={() => remember()}
                      onChange={(e) =>
                        updateTitle(title.key, {
                          end: Math.max(title.start + 0.1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </label>
                </div>
                <select
                  className="h-[36px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[13px]"
                  value={title.font}
                  onChange={(e) => updateTitle(title.key, { font: e.target.value as VideoFont })}
                >
                  {VIDEO_FONTS.map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
                <div className="flex gap-[6px]">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <ToolButton
                      key={align}
                      active={title.align === align}
                      onClick={() => updateTitle(title.key, { align })}
                    >
                      {align === 'center' ? t('editor_centre', 'Centre') : align}
                    </ToolButton>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <input
                    type="color"
                    value={title.color}
                    onChange={(e) => updateTitle(title.key, { color: e.target.value })}
                  />
                  <ToolButton
                    icon="trash"
                    onClick={() => {
                      remember();
                      setDoc((current) => ({
                        ...current,
                        titles: current.titles.filter((item) => item.key !== title.key),
                      }));
                      setSelectedTitle(undefined);
                    }}
                  >
                    {t('editor_delete_title', 'Delete title')}
                  </ToolButton>
                </div>
              </div>
            </Field>
          )}
          <Field label={t('editor_music', 'Music')}>
            <div className="flex flex-col gap-[8px]">
              <div className="flex flex-wrap gap-[6px]">
                <label className="h-[36px] px-[12px] rounded-[8px] bg-btnSimple changeColor text-[13px] flex items-center cursor-pointer">
                  {t('editor_upload', 'Upload')}
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp4,audio/wav,.mp3,.m4a,.wav"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) {
                        uploadMusic(file);
                      }
                    }}
                  />
                </label>
                <ToolButton
                  icon="image"
                  onClick={() =>
                    pick('audio', (items) => {
                      const item = items[0];
                      if (!item) {
                        return;
                      }
                      remember();
                      setDoc((current) => ({
                        ...current,
                        music: {
                          mediaId: item.id,
                          path: item.path,
                          name: item.name,
                          in: 0,
                          start: 0,
                          volume: 40,
                          duration: 0,
                        },
                      }));
                    })
                  }
                >
                  {t('editor_library', 'Library')}
                </ToolButton>
              </div>
              {doc.music && (
                <label className="text-[12px]">
                  {doc.music.name} {doc.music.volume}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={doc.music.volume}
                    className="w-full accent-[#612BD3]"
                    onChange={(e) =>
                      setDoc((current) =>
                        current.music
                          ? { ...current, music: { ...current.music, volume: Number(e.target.value) } }
                          : current
                      )
                    }
                  />
                </label>
              )}
            </div>
          </Field>
        </div>
      </div>

      <div className="rounded-[8px] bg-newBgColorInner p-[10px] overflow-x-auto">
        <div
          ref={timelineRef}
          className="relative pt-[18px]"
          style={{ width: Math.max(total, 1) * PX }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('[data-timeline-item]')) {
              return;
            }
            dragPlayhead(event);
          }}
        >
          <div
            className="absolute top-0 bottom-0 z-[3] cursor-ew-resize"
            style={{ left: playhead * PX - 8, width: 16 }}
            onPointerDown={dragPlayhead}
          >
            <div
              className="absolute top-0 whitespace-nowrap rounded-[4px] bg-[#FF2E93] px-[4px] text-[10px] leading-[16px] text-white"
              style={{
                left: 8,
                transform:
                  playhead * PX < 36
                    ? 'translateX(0)'
                    : total - playhead < 0.8
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
              }}
            >
              {formatTime(playhead, timelineFps)}
            </div>
            <div className="absolute left-[7px] top-[16px] bottom-0 w-[2px] bg-[#FF2E93]" />
            <div className="absolute left-[3px] top-[16px] h-[8px] w-[10px] rounded-b-[3px] bg-[#FF2E93]" />
          </div>
          <div className="relative h-[48px] bg-black/30 rounded-[6px]">
            {placed.map((item, index) => (
              <div
                key={item.key}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  reorder(Number(e.dataTransfer.getData('text/plain')), index);
                }}
                data-timeline-item
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClip(item.key);
                  seekTo(e.clientX);
                }}
                className={clsx(
                  'absolute top-[4px] bottom-[4px] rounded-[4px] text-[11px] px-[8px] flex items-center overflow-hidden text-white',
                  selectedClip === item.key && 'outline outline-1 outline-white'
                )}
                style={{
                  left: item.start * PX,
                  width: Math.max(8, span(item) * PX),
                  background: clipColor(item.tone),
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[6px] cursor-ew-resize"
                  onPointerDown={(e) => dragEdge(item.key, 'in', e)}
                />
                {item.name}
                <div
                  className="absolute right-0 top-0 bottom-0 w-[6px] cursor-ew-resize"
                  onPointerDown={(e) => dragEdge(item.key, 'out', e)}
                />
              </div>
            ))}
          </div>
          <div className="relative h-[28px] mt-[6px]">
            {doc.titles.map((item) => (
              <button
                key={item.key}
                type="button"
                data-timeline-item
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTitle(item.key);
                  seekTo(e.clientX);
                }}
                className={clsx(
                  'absolute top-0 h-full rounded-[4px] bg-white/20 text-[11px] px-[6px] truncate',
                  selectedTitle === item.key && 'outline outline-1 outline-[#612BD3]'
                )}
                style={{
                  left: item.start * PX,
                  width: Math.max(8, (item.end - item.start) * PX),
                }}
              >
                {item.text}
              </button>
            ))}
          </div>
          {doc.music && (
            <div
              data-timeline-item
              className="relative h-[24px] mt-[6px] rounded-[4px] bg-[#4a8]/40 text-[11px] flex items-center px-[6px] cursor-ew-resize"
              style={{ marginLeft: doc.music.start * PX }}
              onPointerDown={(event) => {
                const music = doc.music;
                if (!music) {
                  return;
                }
                remember();
                const startX = event.clientX;
                const initial = music.start;
                const move = (e: PointerEvent) => {
                  const next = Math.max(0, Math.min(total, initial + (e.clientX - startX) / PX));
                  setDoc((current) =>
                    current.music ? { ...current, music: { ...current.music, start: next } } : current
                  );
                };
                const up = () => {
                  window.removeEventListener('pointermove', move);
                  window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up);
              }}
            >
              {doc.music.name}
            </div>
          )}
        </div>
      </div>
      {doc.music && (
        <audio ref={musicRef} src={mediaDirectory.set(doc.music.path)} preload="auto" />
      )}

      <div className="flex items-center justify-between gap-[8px]">
        <div className="text-[12px] text-newTextColor/70">
          {Math.round(total)}s
          {tooLong && ` · ${t('editor_too_long', 'Shorten the edit to 15 minutes or less')}`}
        </div>
        <div className="flex gap-[8px]">
          <button
            type="button"
            onClick={closeModal}
            className="h-[44px] px-[20px] rounded-[8px] border border-newTextColor/10"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={saving || tooLong || !doc.clips.length}
            onClick={save}
            className="h-[44px] px-[20px] rounded-[8px] bg-[#612BD3] text-white disabled:opacity-50"
          >
            {saving ? t('editor_saving', 'Saving…') : t('editor_save', 'Save to library')}
          </button>
        </div>
      </div>
    </div>
  );
};

const LibraryPick: FC<{
  kind: 'video' | 'audio';
  close: () => void;
  onPick: (items: Source[]) => void;
}> = ({ kind, onPick }) => {
  const [Box, setBox] = useState<FC<{
    type?: 'image' | 'video' | 'audio';
    closeModal: () => void;
    setMedia: (items: { id: string; path: string; originalName?: string; name?: string }[]) => void;
  }> | null>(null);
  useEffect(() => {
    import('@gitroom/frontend/components/media/media.component').then((mod) => {
      setBox(() => mod.MediaBox);
    });
  }, []);
  if (!Box) {
    return null;
  }
  return (
    <Box
      type={kind}
      closeModal={() => undefined}
      setMedia={(items) =>
        onPick(
          items.map((item) => ({
            id: item.id,
            path: item.path,
            name: item.originalName || item.name || item.path,
          }))
        )
      }
    />
  );
};

export default MediaVideoEditor;
