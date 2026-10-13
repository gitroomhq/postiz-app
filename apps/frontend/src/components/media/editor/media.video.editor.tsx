'use client';

import {
  FC,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
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
  frameSize,
  VIDEO_EDIT_MAX_OVERLAYS,
  VIDEO_EDIT_MAX_SECONDS,
  VIDEO_RATIOS,
  VideoRatio,
} from '@gitroom/nestjs-libraries/videos/video.edit';
import {
  EditorCanvas,
  EditorDoc,
  EditorLayer,
  EditorTool,
  emptyDoc,
  fullRect,
  LayerOrder,
  loadImage,
  loadSvgs,
  moveLayer,
  newSvgLayer,
  newTextLayer,
  parseSvg,
  renderDoc,
  restackLayers,
  sizeLayerSide,
  TextLayer,
} from '@gitroom/frontend/components/media/editor/media.editor.canvas';
import {
  DrawSection,
  FONTS,
  LayerPanels,
  loadFontList,
  loadGoogleFont,
  PickerScope,
  ShapesSection,
  SvgInsert,
} from '@gitroom/frontend/components/media/editor/media.editor.layers';
import { useBrandKit } from '@gitroom/frontend/components/media/editor/media.editor.presets';
import {
  Field,
  NumberInput,
  Section,
  ToolButton,
} from '@gitroom/frontend/components/media/editor/media.editor.ui';

const MIN_CLIP = 0.1;
const TEXT_SECONDS = 3;
// closest the timeline will go; zoomed out it shrinks to the width on screen
const TIMELINE_MAX_PX = 160;
const ZOOM_STEP = 1.25;

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

interface Music {
  mediaId: string;
  path: string;
  name: string;
  in: number;
  start: number;
  volume: number;
  duration: number;
}

// when a layer shows, in seconds of the edit
interface Span {
  start: number;
  end: number;
}

interface Doc {
  clips: Clip[];
  // back to front, the same order the server stacks them
  layers: EditorLayer[];
  timing: Record<string, Span>;
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

// labels stay about the same distance apart, so zooming in shows a finer step
const scaleStep = (px: number, fps: number) => {
  const raw = 80 / Math.max(px, 0.001);
  const rate = frameRate(fps);
  const steps = [1 / rate, 2 / rate, 5 / rate, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800];
  return steps.find((step) => step >= raw - 0.0001) || 1800;
};

const scaleLabel = (seconds: number, step: number, fps: number) => {
  if (step < 1) {
    return formatTime(seconds, fps);
  }
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
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

// the server encodes at this size, so layers are placed in its pixels
const frameOf = (doc: Doc) =>
  frameSize(doc.shape, {
    width: doc.clips[0]?.width || 1920,
    height: doc.clips[0]?.height || 1080,
  });

const overlayDoc = (doc: Doc) => emptyDoc({ ...frameOf(doc), layers: doc.layers });

// a shorter edit pulls the end back, the stored timing is left alone
const spanOf = (doc: Doc, id: string, total: number): Span => {
  const stored = doc.timing[id] || { start: 0, end: total };
  const end = Math.min(stored.end, total);
  return { start: Math.max(0, Math.min(stored.start, end - MIN_CLIP)), end };
};

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
  const [brand] = useBrandKit();
  const [doc, setDocState] = useState<Doc>({
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
    layers: [],
    timing: {},
    shape: 'original',
    focusX: 0.5,
    focusY: 0.5,
  });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedClip, setSelectedClip] = useState<string | undefined>(doc.clips[0].key);
  const [selectedLayer, setSelectedLayerState] = useState<string>();
  const [tool, setTool] = useState<EditorTool>('select');
  const [drawColor, setDrawColor] = useState('#FF3F3F');
  const [drawSize, setDrawSize] = useState(8);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const history = useRef<Doc[]>([]);
  const pending = useRef<Doc | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const images = useRef(new Map<string, HTMLImageElement>()).current;
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const timelineFrame = useRef<HTMLDivElement | null>(null);
  // 0 shows the whole edit; each step zooms in and the timeline scrolls sideways
  const [zoomLevel, setZoomLevel] = useState(0);
  const [lane, setLane] = useState(0);
  const playingRef = useRef(false);
  const playheadRef = useRef(0);
  const totalRef = useRef(0);
  const fpsRef = useRef(30);
  const fpsRequested = useRef(new Set<string>());
  const selectedLayerRef = useRef<string | undefined>(undefined);
  const pickerOpen = useRef(false);
  const docRef = useRef(doc);
  playingRef.current = playing;

  // the ref moves at once, so a step can be closed in the same handler
  const setDoc = (next: Doc | ((current: Doc) => Doc)) => {
    docRef.current = typeof next === 'function' ? next(docRef.current) : next;
    setDocState(docRef.current);
  };

  const placed = useMemo(() => placedClips(doc.clips), [doc.clips]);
  const total = totalOf(doc.clips);
  const duration = Math.max(total, MIN_CLIP);
  const fitPx = lane > 0 ? lane / duration : 0;
  const px =
    fitPx > 0 ? Math.max(fitPx, Math.min(TIMELINE_MAX_PX, fitPx * ZOOM_STEP ** zoomLevel)) : 0;
  const fitted = px === 0 || px <= fitPx + 0.01;
  const canZoomIn = fitPx > 0 && fitPx * ZOOM_STEP ** (zoomLevel + 1) <= TIMELINE_MAX_PX + 0.01;
  const canZoomOut = zoomLevel > 0;
  const timelineFps = frameRate(doc.clips[0]?.fps);
  const ruler = useMemo(() => {
    if (px <= 0 || total <= 0) {
      return [] as { at: number; label?: string }[];
    }
    const step = scaleStep(px, timelineFps);
    const minor = step / 5;
    const showMinor = minor * px >= 8;
    const marks: { at: number; label?: string }[] = [];
    const count = Math.floor(total / step + 0.0001);
    for (let index = 0; index <= count; index++) {
      const at = index * step;
      marks.push({ at, label: scaleLabel(at, step, timelineFps) });
      if (!showMinor || index === count) {
        continue;
      }
      for (let part = 1; part < 5; part++) {
        const tick = at + minor * part;
        if (tick < total) {
          marks.push({ at: tick });
        }
      }
    }
    return marks;
  }, [px, total, timelineFps]);
  playheadRef.current = playhead;
  totalRef.current = total;
  fpsRef.current = timelineFps;

  useLayoutEffect(() => {
    const el = timelineFrame.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const style = getComputedStyle(el);
      const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      setLane(Math.max(0, el.clientWidth - pad));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // keep the playhead in view when the scale changes, and back at the start when it fits
  useEffect(() => {
    const frame = timelineFrame.current;
    if (!frame) {
      return;
    }
    if (fitted) {
      frame.scrollLeft = 0;
      return;
    }
    frame.scrollLeft = Math.max(0, playheadRef.current * px - frame.clientWidth / 2);
  }, [zoomLevel, fitted, px]);
  const active = placed.find((clip) => playhead < clip.start + span(clip)) || placed[placed.length - 1];
  const frame = frameOf(doc);
  const previewScale =
    stage.w > 0 && stage.h > 0 ? Math.min(stage.w / frame.width, stage.h / frame.height) : 0;

  const setSelectedLayer = (id?: string) => {
    selectedLayerRef.current = id;
    setSelectedLayerState(id);
    if (id) {
      setSelectedClip(undefined);
    }
  };

  const remember = () => {
    history.current = [...history.current.slice(-49), docRef.current];
    setCanUndo(true);
  };

  // begin / end group live edits (drags, sliders, typing) into one undo step
  const begin = () => {
    if (!pending.current) {
      pending.current = docRef.current;
    }
  };
  const end = () => {
    if (pending.current && pending.current !== docRef.current) {
      history.current = [...history.current.slice(-49), pending.current];
      setCanUndo(true);
    }
    pending.current = null;
  };
  // pointer down comes before the blur of a focused field, so blur it now to close its step first
  const beginStep = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    end();
    begin();
  };
  const commit = (fn: (current: Doc) => Doc) => {
    beginStep();
    setDoc(fn);
    end();
  };

  const undo = () => {
    end();
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
    loadFontList();
  }, []);

  useEffect(() => {
    const box = stageRef.current;
    if (!box) {
      return;
    }
    // the padding of the stage
    const measure = () => setStage({ w: box.clientWidth - 24, h: box.clientHeight - 24 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

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

  const removeLayer = (id: string) => {
    commit((current) => {
      const { [id]: _removed, ...timing } = current.timing;
      return { ...current, layers: current.layers.filter((l) => l.id !== id), timing };
    });
    setSelectedLayer(undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        pickerOpen.current ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        target?.isContentEditable
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((value) => !value);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerRef.current) {
        e.preventDefault();
        removeLayer(selectedLayerRef.current);
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

  const pick = (kind: 'video' | 'audio' | 'image', onPick: (items: Source[]) => void) => {
    pickerOpen.current = true;
    modals.openModal({
      title:
        kind === 'video'
          ? t('editor_add_clip', 'Add clip')
          : kind === 'image'
          ? t('editor_add_image', 'Add image')
          : t('editor_music', 'Music'),
      fullScreen: true,
      size: 'calc(100% - 80px)',
      height: 'calc(100% - 80px)',
      closeOnEscape: true,
      askClose: false,
      children: (close) => (
        <PickerScope onUnmount={() => (pickerOpen.current = false)}>
          <LibraryPick kind={kind} close={close} onPick={onPick} />
        </PickerScope>
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
    setSelectedLayer(undefined);
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

  // text starts at the playhead for a few seconds, anything else runs to the end
  const newSpan = (layer: EditorLayer): Span => {
    const length = totalRef.current;
    if (layer.kind === 'text') {
      const start = Math.min(playheadRef.current, Math.max(0, length - 1));
      return { start, end: Math.min(length, start + TEXT_SECONDS) };
    }
    return { start: Math.min(playheadRef.current, Math.max(0, length - MIN_CLIP)), end: length };
  };

  const tooManyLayers = () =>
    toaster.show(
      t('editor_layer_limit', 'A video can have at most {{count}} layers', {
        count: VIDEO_EDIT_MAX_OVERLAYS,
      }),
      'warning'
    );

  // the canvas edits a picture doc of the layers, new layers get their timing here
  const updateOverlay = (fn: (current: EditorDoc) => EditorDoc) => {
    const current = docRef.current;
    const layers = fn(overlayDoc(current)).layers;
    if (layers === current.layers) {
      return;
    }
    if (layers.length > VIDEO_EDIT_MAX_OVERLAYS && layers.length > current.layers.length) {
      tooManyLayers();
      return;
    }
    const added = layers.filter((l) => !current.timing[l.id]);
    setDoc({
      ...current,
      layers,
      timing: added.length
        ? { ...current.timing, ...Object.fromEntries(added.map((l) => [l.id, newSpan(l)])) }
        : current.timing,
    });
  };

  const addLayers = (layers: EditorLayer[]) => {
    if (!layers.length) {
      return false;
    }
    if (docRef.current.layers.length + layers.length > VIDEO_EDIT_MAX_OVERLAYS) {
      tooManyLayers();
      return false;
    }
    beginStep();
    updateOverlay((d) => ({ ...d, layers: [...d.layers, ...layers] }));
    end();
    setTool('select');
    setSelectedLayer(layers[layers.length - 1].id);
    return true;
  };

  const updateLayer = (id: string, fields: Partial<EditorLayer>) => {
    updateOverlay((current) => ({
      ...current,
      layers: current.layers.map((l) => (l.id === id ? ({ ...l, ...fields } as EditorLayer) : l)),
    }));
  };

  const commitLayer = (id: string, fields: Partial<EditorLayer>) => {
    beginStep();
    updateLayer(id, fields);
    end();
  };

  const setLayerSize = (id: string, side: 'w' | 'h', value: number, locked: boolean) => {
    updateOverlay((current) => ({
      ...current,
      layers: current.layers.map((l) => (l.id === id ? sizeLayerSide(l, side, value, locked) : l)),
    }));
  };

  const reorderLayer = (id: string, to: LayerOrder) => {
    commit((current) => ({ ...current, layers: restackLayers(current.layers, id, to) }));
  };

  const duplicateLayer = (id: string) => {
    const current = docRef.current;
    const layer = current.layers.find((l) => l.id === id);
    if (!layer) {
      return;
    }
    if (current.layers.length >= VIDEO_EDIT_MAX_OVERLAYS) {
      tooManyLayers();
      return;
    }
    const offset = Math.max(1, Math.round(frameOf(current).width / 400)) * 10;
    const copy = { ...moveLayer(layer, offset, offset), id: makeId(10) };
    commit((d) => {
      const layers = [...d.layers];
      layers.splice(layers.findIndex((l) => l.id === id) + 1, 0, copy);
      return { ...d, layers, timing: { ...d.timing, [copy.id]: spanOf(d, id, totalRef.current) } };
    });
    setSelectedLayer(copy.id);
  };

  const setLayerSpan = (id: string, next: Span) => {
    setDoc((current) => ({ ...current, timing: { ...current.timing, [id]: next } }));
  };

  const ensureFont = async (family: string) => {
    if (!(await loadGoogleFont(family))) {
      toaster.show(
        t('editor_font_not_found', 'Could not find "{{font}}" on Google Fonts', {
          font: family,
        }),
        'warning'
      );
      return false;
    }
    setFontsVersion((v) => v + 1);
    return true;
  };

  const addText = async () => {
    const font = (await ensureFont(brand.font || FONTS[0])) ? brand.font || FONTS[0] : FONTS[0];
    addLayers([newTextLayer(overlayDoc(docRef.current), font, t('editor_your_text', 'Your text'))]);
  };

  const addSvg = (markup: string) => {
    const svg = parseSvg(markup);
    if (!svg) {
      toaster.show(
        t(
          'editor_svg_invalid',
          "Couldn't read this SVG. It needs a viewBox or a width and height, and must be under 1 MB."
        ),
        'warning'
      );
      return false;
    }
    return addLayers([newSvgLayer(overlayDoc(docRef.current), svg)]);
  };

  const openSvgInsert = () => {
    pickerOpen.current = true;
    modals.openModal({
      title: t('editor_add_svg', 'Add SVG'),
      askClose: false,
      closeOnEscape: true,
      children: (close) => (
        <PickerScope onUnmount={() => (pickerOpen.current = false)}>
          <SvgInsert onInsert={addSvg} close={close} />
        </PickerScope>
      ),
    });
  };

  const addImages = async (items: Source[]) => {
    const area = fullRect(overlayDoc(docRef.current));
    const layers: EditorLayer[] = [];
    for (const item of items) {
      try {
        const img = await loadImage(item.path);
        images.set(item.path, img);
        const w = Math.min(img.naturalWidth, area.w * 0.4);
        const h = (w * img.naturalHeight) / img.naturalWidth;
        layers.push({
          id: makeId(10),
          kind: 'image',
          opacity: 100,
          rotation: 0,
          src: item.path,
          x: (area.w - w) / 2,
          y: (area.h - h) / 2,
          w,
          h,
        });
      } catch (e) {
        toaster.show(
          t('editor_image_load_failed', "Couldn't load this image for editing"),
          'warning'
        );
      }
    }
    addLayers(layers);
  };

  const changeTool = (next: EditorTool) => {
    if (next === 'draw') {
      setDrawSize(Math.max(2, Math.round(frame.width / 150)));
    }
    setTool(next);
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

  // each layer becomes a full-frame transparent picture, the server lays them over the video
  const renderOverlays = async (current: Doc, layers: EditorLayer[]) => {
    const base = overlayDoc(current);
    await Promise.all(
      layers
        .filter((l): l is TextLayer => l.kind === 'text')
        .map((l) => loadGoogleFont(l.font))
    );
    await loadSvgs(base);
    const canvas = document.createElement('canvas');
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d')!;
    const blobs: Blob[] = [];
    for (const layer of layers) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderDoc(ctx, { ...base, layers: [layer] }, images, fullRect(base));
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Could not export a layer');
      }
      blobs.push(blob);
    }
    return blobs;
  };

  const save = async () => {
    end();
    setSaving(true);
    try {
      const current = docRef.current;
      const length = totalOf(current.clips);
      // a layer that starts after the end of a shortened edit is left out
      const layers = current.layers.filter(
        (l) =>
          (l.kind !== 'text' || l.text.trim()) &&
          (current.timing[l.id]?.start ?? 0) < length
      );
      const pictures = await renderOverlays(current, layers);
      const body = new FormData();
      body.append(
        'edit',
        JSON.stringify({
          clips: current.clips.map((clip) => ({
            mediaId: clip.mediaId,
            in: clip.in,
            out: clip.out,
            muted: clip.muted,
          })),
          overlays: layers.map((layer) => spanOf(current, layer.id, length)),
          ...(current.music
            ? {
                music: {
                  mediaId: current.music.mediaId,
                  in: current.music.in,
                  start: current.music.start,
                  volume: current.music.volume,
                },
              }
            : {}),
          shape: current.shape,
          focusX: current.focusX,
          focusY: current.focusY,
        })
      );
      pictures.forEach((picture, index) => body.append('overlays', picture, `layer-${index}.png`));
      const response = await fetch('/media/video-edit', { method: 'POST', body });
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

  const clip = doc.clips.find((item) => item.key === selectedClip);
  const layer = doc.layers.find((item) => item.id === selectedLayer);
  const layerSpan = layer && spanOf(doc, layer.id, total);
  const tooLong = total > VIDEO_EDIT_MAX_SECONDS;
  const canvasDoc = useMemo(
    () => emptyDoc({ width: frame.width, height: frame.height, layers: doc.layers }),
    [doc.layers, frame.width, frame.height]
  );
  // a layer is on screen only while the playhead sits inside its From/To
  const hiddenKey = doc.layers
    .filter((item) => {
      const at = spanOf(doc, item.id, total);
      return playhead < at.start || playhead >= at.end;
    })
    .map((item) => item.id)
    .join(',');
  const hidden = useMemo(() => (hiddenKey ? hiddenKey.split(',') : []), [hiddenKey]);
  const live = { onFocus: begin, onBlur: end };
  const liveRange = {
    onPointerDown: begin,
    onKeyDown: begin,
    onPointerUp: end,
    onKeyUp: end,
    onBlur: end,
  };

  const layerName = (item: EditorLayer) =>
    item.kind === 'text'
      ? item.text.trim() || t('editor_text', 'Text')
      : item.kind === 'image'
      ? t('editor_image', 'Image')
      : item.kind === 'stroke'
      ? t('editor_drawing', 'Drawing')
      : item.kind === 'svg'
      ? t('editor_svg', 'SVG')
      : t('editor_shape', 'Shape');

  // a click on the picture that hits no layer drags the framing instead
  const dragFocus = (event: ReactPointerEvent) => {
    if (tool !== 'select' || selectedLayerRef.current) {
      return;
    }
    setSelectedClip(undefined);
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
    setPlayhead(Math.max(0, Math.min(total, (clientX - rect.left) / (px || 1))));
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
      trim(key, edge, initial + (e.clientX - startX) / (px || 1));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    event.stopPropagation();
  };

  // the middle moves the layer in time, an end changes when it comes in or goes out
  const dragSpan = (id: string, mode: 'move' | 'start' | 'end', event: ReactPointerEvent) => {
    event.stopPropagation();
    setSelectedLayer(id);
    setTool('select');
    beginStep();
    const startX = event.clientX;
    const length = totalRef.current;
    const initial = spanOf(docRef.current, id, length);
    let moved = false;
    const move = (e: PointerEvent) => {
      const by = (e.clientX - startX) / (px || 1);
      moved = moved || Math.abs(e.clientX - startX) > 2;
      if (!moved) {
        return;
      }
      if (mode === 'move') {
        const width = initial.end - initial.start;
        const start = Math.max(0, Math.min(length - width, initial.start + by));
        setLayerSpan(id, { start, end: start + width });
      } else if (mode === 'start') {
        setLayerSpan(id, {
          start: Math.max(0, Math.min(initial.end - MIN_CLIP, initial.start + by)),
          end: initial.end,
        });
      } else {
        setLayerSpan(id, {
          start: initial.start,
          end: Math.min(length, Math.max(initial.start + MIN_CLIP, initial.end + by)),
        });
      }
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      end();
      if (!moved) {
        seekTo(e.clientX);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const jumpTo = (time: number) => {
    playingRef.current = false;
    setPlaying(false);
    const next = Math.max(0, Math.min(totalRef.current, time));
    playheadRef.current = next;
    setPlayhead(next);
    const frame = timelineFrame.current;
    if (frame && !fitted) {
      frame.scrollLeft = Math.max(0, next * px - frame.clientWidth / 2);
    }
  };

  // at the end of the edit the playhead is still in the last clip
  const clipIndex = placed.findIndex((clip) => playhead < clip.start + span(clip) - 0.001);
  const currentClip = clipIndex === -1 ? placed.length - 1 : clipIndex;
  const here = placed[currentClip];
  // past a clip's own start, previous returns there; already on a start, it steps back one
  const previousAt =
    here && playhead > here.start + 0.001
      ? here.start
      : currentClip > 0
      ? placed[currentClip - 1].start
      : undefined;

  return (
    <div className="flex flex-col gap-[12px] w-full h-full min-h-0 min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-wrap gap-[8px] items-center">
        <ToolButton icon="select" active={tool === 'select'} onClick={() => changeTool('select')}>
          {t('editor_select', 'Select')}
        </ToolButton>
        <ToolButton icon="text" onClick={addText}>
          {t('editor_add_text', 'Add text')}
        </ToolButton>
        <ToolButton icon="draw" active={tool === 'draw'} onClick={() => changeTool('draw')}>
          {t('editor_draw', 'Draw')}
        </ToolButton>
        <ToolButton icon="shapes" active={tool === 'shape'} onClick={() => changeTool('shape')}>
          {t('editor_shapes', 'Shapes')}
        </ToolButton>
        <ToolButton icon="image" onClick={() => pick('image', addImages)}>
          {t('editor_add_image', 'Add image')}
        </ToolButton>
        <ToolButton icon="svg" onClick={openSvgInsert}>
          {t('editor_add_svg', 'Add SVG')}
        </ToolButton>
        <div className="flex-1" />
        {(
          [
            ['original', t('editor_original', 'Original')],
            ...VIDEO_RATIOS.map((ratio) => [ratio, ratio] as const),
          ] as const
        ).map(([shape, label]) => (
          <ToolButton
            key={shape}
            active={doc.shape === shape}
            onClick={() => commit((current) => ({ ...current, shape }))}
          >
            {label}
          </ToolButton>
        ))}
      </div>

      <div className="flex gap-[16px] flex-1 min-h-0 mobile:flex-col">
        <div
          ref={stageRef}
          className="flex-1 flex items-center justify-center rounded-[8px] bg-newBgColorInner p-[12px] min-h-[280px] min-w-0 overflow-hidden"
        >
          <div
            ref={previewRef}
            className="relative bg-black overflow-hidden shrink-0"
            style={{ width: frame.width * previewScale, height: frame.height * previewScale }}
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
            <div className="absolute inset-0" onPointerDown={dragFocus}>
              <EditorCanvas
                doc={canvasDoc}
                images={images}
                tool={tool}
                selectedId={selectedLayer && hidden.includes(selectedLayer) ? undefined : selectedLayer}
                onSelect={setSelectedLayer}
                onBegin={beginStep}
                onUpdate={updateOverlay}
                onEnd={end}
                onCropDraft={() => undefined}
                drawColor={drawColor}
                drawSize={drawSize}
                shape="rect"
                onShapeCreated={(id) => {
                  setTool('select');
                  setSelectedLayer(id);
                }}
                zoom="fit"
                onZoom={() => undefined}
                fontsVersion={fontsVersion}
                hidden={hidden}
                transparent
              />
            </div>
          </div>
        </div>
        <div className="w-[300px] mobile:w-full flex flex-col gap-[12px] overflow-y-auto">
          {tool === 'draw' && (
            <DrawSection
              color={drawColor}
              size={drawSize}
              swatches={brand.colors}
              onColor={setDrawColor}
              onSize={setDrawSize}
            />
          )}

          {tool === 'shape' && <ShapesSection onPick={addSvg} />}

          {tool === 'select' && layer && layerSpan && (
            <>
              <Section title={t('editor_timing', 'Timing')}>
                <div className="flex gap-[12px] items-end">
                  <Field label={`${t('editor_from', 'From')} (s)`}>
                    <NumberInput
                      className="w-[100px]"
                      min={0}
                      max={total}
                      step={0.1}
                      value={Number(layerSpan.start.toFixed(2))}
                      {...live}
                      onValue={(start) =>
                        setLayerSpan(layer.id, {
                          start: Math.min(start, layerSpan.end - MIN_CLIP),
                          end: layerSpan.end,
                        })
                      }
                    />
                  </Field>
                  <Field label={`${t('editor_to', 'To')} (s)`}>
                    <NumberInput
                      className="w-[100px]"
                      min={0}
                      max={total}
                      step={0.1}
                      value={Number(layerSpan.end.toFixed(2))}
                      {...live}
                      onValue={(value) =>
                        setLayerSpan(layer.id, {
                          start: layerSpan.start,
                          end: Math.max(value, layerSpan.start + MIN_CLIP),
                        })
                      }
                    />
                  </Field>
                </div>
              </Section>
              <LayerPanels
                selected={layer}
                swatches={brand.colors}
                live={live}
                liveRange={liveRange}
                updateLayer={updateLayer}
                commitLayer={commitLayer}
                setLayerSize={setLayerSize}
                ensureFont={ensureFont}
                reorderLayer={reorderLayer}
                duplicateLayer={duplicateLayer}
                removeLayer={removeLayer}
              />
            </>
          )}

          {tool === 'select' && !layer && clip && (
            <Section title={clip.name}>
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
                    setSelectedClip(undefined);
                  }}
                >
                  {t('editor_delete_clip', 'Delete clip')}
                </ToolButton>
              </div>
            </Section>
          )}

          {tool === 'select' && !layer && !clip && (
            <>
              <Section title={t('editor_frame', 'Frame')}>
                <div className="text-[13px]">
                  {frame.width} × {frame.height}px
                </div>
                <div>
                  <ToolButton
                    icon="image"
                    onClick={() => pick('video', (items) => items[0] && addClip(items[0]))}
                  >
                    {t('editor_add_clip', 'Add clip')}
                  </ToolButton>
                </div>
              </Section>
              <Section title={t('editor_music', 'Music')}>
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
                  <Field label={`${doc.music.name} ${doc.music.volume}%`}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={doc.music.volume}
                      className="w-full accent-[#612BD3]"
                      {...liveRange}
                      onChange={(e) =>
                        setDoc((current) =>
                          current.music
                            ? { ...current, music: { ...current.music, volume: Number(e.target.value) } }
                            : current
                        )
                      }
                    />
                  </Field>
                )}
              </Section>
            </>
          )}
        </div>
      </div>

      <div
        ref={timelineFrame}
        className="min-w-0 w-full max-w-full rounded-[8px] bg-newBgColorInner p-[10px] overflow-x-auto max-h-[40vh] overflow-y-auto"
      >
        <div
          ref={timelineRef}
          className="relative pt-[22px]"
          style={{ width: fitted ? '100%' : duration * px }}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('[data-timeline-item]')) {
              return;
            }
            dragPlayhead(event);
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[20px] pointer-events-none">
            {ruler.map((mark, index) => (
              <div key={index} className="absolute top-0 h-full" style={{ left: mark.at * px }}>
                {mark.label && (
                  <span
                    className="absolute top-0 text-[10px] leading-[12px] text-white/50 whitespace-nowrap"
                    style={{
                      transform:
                        mark.at === 0
                          ? undefined
                          : total - mark.at < scaleStep(px, timelineFps) * 0.6
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                    }}
                  >
                    {mark.label}
                  </span>
                )}
                <span
                  className={clsx(
                    'absolute bottom-0 left-0 w-px bg-white/40',
                    mark.label ? 'h-[6px]' : 'h-[3px]'
                  )}
                />
              </div>
            ))}
          </div>
          <div
            className="absolute top-0 bottom-0 z-[3] cursor-ew-resize"
            style={{ left: playhead * px - 8, width: 16 }}
            onPointerDown={dragPlayhead}
          >
            <div
              className="absolute top-0 whitespace-nowrap rounded-[4px] bg-[#FF2E93] px-[4px] text-[10px] leading-[16px] text-white"
              style={{
                left: 8,
                transform:
                  playhead * px < 36
                    ? 'translateX(0)'
                    : total - playhead < 0.8
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
              }}
            >
              {formatTime(playhead, timelineFps)}
            </div>
            <div className="absolute left-[7px] top-[20px] bottom-0 w-[2px] bg-[#FF2E93]" />
            <div className="absolute left-[3px] top-[20px] h-[8px] w-[10px] rounded-b-[3px] bg-[#FF2E93]" />
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
                  setSelectedLayer(undefined);
                  setTool('select');
                  seekTo(e.clientX);
                }}
                className={clsx(
                  'absolute top-[4px] bottom-[4px] rounded-[4px] text-[11px] px-[8px] flex items-center overflow-hidden text-white',
                  selectedClip === item.key && 'outline outline-1 outline-white'
                )}
                style={{
                  left: item.start * px,
                  width: Math.max(8, span(item) * px),
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
          {doc.layers.map((item) => {
            const at = spanOf(doc, item.id, total);
            return (
              <div key={item.id} className="relative h-[24px] mt-[4px]">
                <div
                  data-timeline-item
                  onPointerDown={(e) => dragSpan(item.id, 'move', e)}
                  className={clsx(
                    'absolute top-0 h-full rounded-[4px] bg-white/20 text-[11px] px-[8px] flex items-center cursor-grab select-none',
                    selectedLayer === item.id && 'outline outline-1 outline-[#612BD3]'
                  )}
                  style={{
                    left: at.start * px,
                    width: Math.max(8, (at.end - at.start) * px),
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[6px] cursor-ew-resize"
                    onPointerDown={(e) => dragSpan(item.id, 'start', e)}
                  />
                  <span className="truncate">{layerName(item)}</span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-[6px] cursor-ew-resize"
                    onPointerDown={(e) => dragSpan(item.id, 'end', e)}
                  />
                </div>
              </div>
            );
          })}
          {doc.music && (
            <div
              data-timeline-item
              className="relative h-[24px] mt-[6px] rounded-[4px] bg-[#4a8]/40 text-[11px] flex items-center px-[6px] cursor-ew-resize"
              style={{ marginLeft: doc.music.start * px }}
              onPointerDown={(event) => {
                const music = doc.music;
                if (!music) {
                  return;
                }
                remember();
                const startX = event.clientX;
                const initial = music.start;
                const move = (e: PointerEvent) => {
                  const next = Math.max(0, Math.min(total, initial + (e.clientX - startX) / (px || 1)));
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[8px]">
        <div className="flex items-center gap-[8px] min-w-0">
          <ToolButton
            title={t('editor_zoom_out', 'Zoom out')}
            disabled={!canZoomOut}
            onClick={() => setZoomLevel((level) => Math.max(0, level - 1))}
          >
            {t('editor_zoom_out', 'Zoom out')}
          </ToolButton>
          <ToolButton
            title={t('editor_zoom_in', 'Zoom in')}
            disabled={!canZoomIn}
            onClick={() => setZoomLevel((level) => level + 1)}
          >
            {t('editor_zoom_in', 'Zoom in')}
          </ToolButton>
          <div className="text-[12px] text-newTextColor/70">
            {Math.round(total)}s
            {tooLong && ` · ${t('editor_too_long', 'Shorten the edit to 15 minutes or less')}`}
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <ToolButton
            icon="toStart"
            title={t('editor_to_start', 'To start')}
            disabled={playhead <= 0.001}
            onClick={() => jumpTo(0)}
          >
            {t('editor_to_start', 'To start')}
          </ToolButton>
          <ToolButton
            icon="clipBack"
            title={t('editor_previous_clip', 'Previous clip')}
            disabled={previousAt === undefined}
            onClick={() => previousAt !== undefined && jumpTo(previousAt)}
          >
            {t('editor_previous_clip', 'Previous clip')}
          </ToolButton>
          <ToolButton icon={playing ? 'pause' : 'play'} onClick={() => setPlaying((value) => !value)}>
            {playing ? t('editor_pause', 'Pause') : t('editor_play', 'Play')}
          </ToolButton>
          <ToolButton
            icon="clipForward"
            title={t('editor_next_clip', 'Next clip')}
            disabled={currentClip >= placed.length - 1}
            onClick={() => jumpTo(placed[currentClip + 1].start)}
          >
            {t('editor_next_clip', 'Next clip')}
          </ToolButton>
          <ToolButton
            icon="toEnd"
            title={t('editor_to_end', 'To end')}
            disabled={playhead >= total - 0.001}
            onClick={() => jumpTo(total)}
          >
            {t('editor_to_end', 'To end')}
          </ToolButton>
          <ToolButton icon="split" onClick={split}>
            {t('editor_split', 'Split')}
          </ToolButton>
          <ToolButton icon="undo" disabled={!canUndo} onClick={undo}>
            {t('editor_undo', 'Undo')}
          </ToolButton>
        </div>
        <div className="flex gap-[8px] justify-end">
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
  kind: 'video' | 'audio' | 'image';
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
