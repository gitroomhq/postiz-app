'use client';

import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import {
  MediaBox,
  mediaLibrarySize,
} from '@gitroom/frontend/components/media/media.component';
import {
  compSize,
  EditorCanvas,
  EditorDoc,
  EditorLayer,
  EditorTool,
  EditorZoom,
  fullRect,
  loadImage,
  moveLayer,
  newTextLayer,
  ratioRect,
  Rect,
  renderDoc,
  rotateDoc,
  ShapeKind,
  supportsFilters,
  TextLayer,
  visibleRect,
} from '@gitroom/frontend/components/media/editor/media.editor.canvas';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

const FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Raleway',
  'Nunito',
  'Work Sans',
  'DM Sans',
  'Space Grotesk',
  'Oswald',
  'Bebas Neue',
  'Anton',
  'Archivo Black',
  'Barlow Condensed',
  'Bangers',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Libre Baskerville',
  'DM Serif Display',
  'Abril Fatface',
  'Roboto Slab',
  'Space Mono',
  'Pacifico',
  'Lobster',
  'Dancing Script',
  'Caveat',
  'Permanent Marker',
];

const PRESETS = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1080 × 1920', w: 1080, h: 1920 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

const RATIOS: { label: string; value?: number }[] = [
  { label: 'Free' },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

const MAX_SIZE = 8000;
const HISTORY = 50;

const googleFontsUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${family
    .trim()
    .replace(/ /g, '+')}`;

const addStylesheet = (href: string) =>
  new Promise<boolean>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(true);
    link.onerror = () => {
      link.remove();
      resolve(false);
    };
    document.head.appendChild(link);
  });

const loadedFonts = new Map<string, Promise<boolean>>();
const loadGoogleFont = (family: string) => {
  const key = family.trim();
  if (!loadedFonts.has(key)) {
    const loading = (async () => {
      const url = googleFontsUrl(key);
      // families without bold or italic reject the full request
      const found =
        (await addStylesheet(
          `${url}:ital,wght@0,400;0,700;1,400;1,700&display=swap`
        )) || (await addStylesheet(`${url}&display=swap`));
      if (!found) {
        return false;
      }
      await Promise.all(
        ['', 'bold ', 'italic ', 'italic bold '].map((style) =>
          document.fonts.load(`${style}16px "${key}"`).catch(() => [])
        )
      );
      let loaded = false;
      document.fonts.forEach((face) => {
        if (face.family.replace(/"/g, '') === key && face.status === 'loaded') {
          loaded = true;
        }
      });
      return loaded;
    })();
    loadedFonts.set(key, loading);
    loading.then((ok) => !ok && loadedFonts.delete(key));
  }
  return loadedFonts.get(key)!;
};

// one stylesheet so the font list can show every family in its own face
let fontList: Promise<boolean> | undefined;
const loadFontList = () => {
  fontList =
    fontList ||
    addStylesheet(
      `https://fonts.googleapis.com/css2?${FONTS.map(
        (f) => `family=${f.replace(/ /g, '+')}`
      ).join('&')}&display=swap`
    );
  return fontList;
};

const isJpeg = (path: string) => /\.jpe?g(\?|#|$)/i.test(path);

const NEUTRAL_ADJUSTMENTS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  fade: 0,
  vignette: 0,
  sharpen: 0,
};

type Adjustment = keyof typeof NEUTRAL_ADJUSTMENTS;

const emptyDoc = (fields: Partial<EditorDoc>): EditorDoc => ({
  width: 1080,
  height: 1080,
  color: '',
  rotate: 0,
  flipX: false,
  flipY: false,
  ...NEUTRAL_ADJUSTMENTS,
  layers: [],
  ...fields,
});

const inputClass =
  'h-[36px] px-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[13px] outline-none focus:border-[#612BD3]';

const ToolButton: FC<{
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}> = ({ active, disabled, onClick, children }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={clsx(
      'h-[36px] px-[12px] rounded-[8px] text-[13px] flex items-center gap-[6px] select-none whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed',
      active ? 'bg-[#612BD3] text-white' : 'bg-btnSimple changeColor'
    )}
  >
    {children}
  </button>
);

const Section: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-[10px] p-[12px] rounded-[8px] bg-newBgColorInner">
    <div className="text-[13px] font-[600]">{title}</div>
    {children}
  </div>
);

// keeps what is typed until it is a valid number, so the field can be cleared
const NumberInput: FC<{
  value: number;
  min: number;
  max: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onValue: (value: number) => void;
}> = ({ value, min, max, className, onFocus, onBlur, onValue }) => {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);
  return (
    <input
      type="number"
      className={clsx(inputClass, className)}
      min={min}
      max={max}
      value={draft}
      onFocus={() => {
        setFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const number = Number(e.target.value);
        if (e.target.value && number >= min && number <= max) {
          onValue(number);
        }
      }}
    />
  );
};

// lets the editor ignore its shortcuts while the library picker is on top
const PickerScope: FC<{ onUnmount: () => void; children: ReactNode }> = ({
  onUnmount,
  children,
}) => {
  useEffect(() => onUnmount, []);
  return <>{children}</>;
};

const Field: FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <label className="flex flex-col gap-[4px] text-[12px] text-newTextColor/70">
    {label}
    {children}
  </label>
);

const MediaEditor: FC<{
  setMedia: (params: { id: string; path: string }[]) => void;
  closeModal: () => void;
  width?: number;
  height?: number;
  media?: { path: string; name?: string };
}> = (props) => {
  const { setMedia, closeModal, media } = props;
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();

  const setActivateExitButton = useLaunchStore((e) => e.setActivateExitButton);
  useEffect(() => {
    setActivateExitButton(false);
    return () => {
      setActivateExitButton(true);
    };
  }, []);

  const images = useRef(new Map<string, HTMLImageElement>()).current;
  const [doc, setDocState] = useState<EditorDoc>();
  const docRef = useRef<EditorDoc | undefined>(undefined);
  const past = useRef<EditorDoc[]>([]);
  const future = useRef<EditorDoc[]>([]);
  const pending = useRef<EditorDoc | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [tool, setTool] = useState<EditorTool>('select');
  const [selectedId, setSelectedIdState] = useState<string>();
  const selectedRef = useRef<string | undefined>(undefined);
  const [cropDraft, setCropDraft] = useState<Rect>();
  const [cropRatio, setCropRatio] = useState<number>();
  const [drawColor, setDrawColor] = useState('#FF3F3F');
  const [drawSize, setDrawSize] = useState(8);
  const [shape, setShape] = useState<ShapeKind>('rect');
  const [zoom, setZoom] = useState<EditorZoom>('fit');
  const [fontsVersion, setFontsVersion] = useState(0);
  const [customFont, setCustomFont] = useState('');
  const [loading, setLoading] = useState(!!media);
  const [saving, setSaving] = useState(false);

  const [blankWidth, setBlankWidth] = useState(props.width || 1080);
  const [blankHeight, setBlankHeight] = useState(props.height || 1080);
  const [blankColor, setBlankColor] = useState('#FFFFFF');

  const setDoc = useCallback((next: EditorDoc) => {
    docRef.current = next;
    setDocState(next);
  }, []);

  const setSelectedId = useCallback((id?: string) => {
    selectedRef.current = id;
    setSelectedIdState(id);
  }, []);

  // begin / update / end group live edits (drags, sliders, typing) into one undo step
  const begin = useCallback(() => {
    if (!pending.current) {
      pending.current = docRef.current || null;
    }
  }, []);

  const update = useCallback((fn: (current: EditorDoc) => EditorDoc) => {
    if (docRef.current) {
      setDoc(fn(docRef.current));
    }
  }, []);

  const end = useCallback(() => {
    if (pending.current && pending.current !== docRef.current) {
      past.current = [...past.current, pending.current].slice(-HISTORY);
      future.current = [];
      setCanUndo(true);
      setCanRedo(false);
    }
    pending.current = null;
  }, []);

  const resetHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setZoom('fit');
  }, []);

  // the canvas fires before the blur of a focused field, so close that step first
  const beginStep = useCallback(() => {
    end();
    begin();
  }, []);

  const commit = useCallback((fn: (current: EditorDoc) => EditorDoc) => {
    beginStep();
    update(fn);
    end();
  }, []);

  const undo = useCallback(() => {
    end();
    const previous = past.current[past.current.length - 1];
    if (!previous || !docRef.current) {
      return;
    }
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, docRef.current];
    setCanUndo(!!past.current.length);
    setCanRedo(true);
    setDoc(previous);
  }, []);

  const redo = useCallback(() => {
    end();
    const next = future.current[future.current.length - 1];
    if (!next || !docRef.current) {
      return;
    }
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, docRef.current].slice(-HISTORY);
    setCanUndo(true);
    setCanRedo(!!future.current.length);
    setDoc(next);
  }, []);

  const updateLayer = useCallback(
    (id: string, fields: Partial<EditorLayer>) => {
      update((current) => ({
        ...current,
        layers: current.layers.map((l) =>
          l.id === id ? ({ ...l, ...fields } as EditorLayer) : l
        ),
      }));
    },
    []
  );

  const commitLayer = useCallback(
    (id: string, fields: Partial<EditorLayer>) => {
      beginStep();
      updateLayer(id, fields);
      end();
    },
    []
  );

  const pickerOpen = useRef(false);

  const removeLayer = useCallback((id: string) => {
    commit((current) => ({
      ...current,
      layers: current.layers.filter((l) => l.id !== id),
    }));
    setSelectedId(undefined);
  }, []);

  const reorderLayer = useCallback(
    (id: string, to: 'front' | 'forward' | 'backward' | 'back') => {
      commit((current) => {
        const layers = [...current.layers];
        const from = layers.findIndex((l) => l.id === id);
        const index = {
          front: layers.length - 1,
          forward: Math.min(layers.length - 1, from + 1),
          backward: Math.max(0, from - 1),
          back: 0,
        }[to];
        const [layer] = layers.splice(from, 1);
        layers.splice(index, 0, layer);
        return { ...current, layers };
      });
    },
    []
  );

  // a step that is visible on screen whatever the image size
  const nudgeStep = (current: EditorDoc) =>
    Math.max(1, Math.round(visibleRect(current).w / 400));

  const duplicateLayer = useCallback((id: string) => {
    const current = docRef.current;
    const layer = current?.layers.find((l) => l.id === id);
    if (!current || !layer) {
      return;
    }
    const offset = nudgeStep(current) * 10;
    const copy = { ...moveLayer(layer, offset, offset), id: makeId(10) };
    commit((d) => {
      const layers = [...d.layers];
      layers.splice(layers.findIndex((l) => l.id === id) + 1, 0, copy);
      return { ...d, layers };
    });
    setSelectedId(copy.id);
  }, []);

  useEffect(() => {
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        pickerOpen.current ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (
        (e.metaKey || e.ctrlKey) &&
        ((key === 'z' && e.shiftKey) || (key === 'y' && !e.metaKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      const id = selectedRef.current;
      if ((e.key === 'Delete' || e.key === 'Backspace') && id) {
        e.preventDefault();
        removeLayer(id);
        return;
      }
      const arrow = arrows[e.key];
      if (arrow && id && docRef.current) {
        e.preventDefault();
        const step = nudgeStep(docRef.current) * (e.shiftKey ? 10 : 1);
        // a held key is one undo step, closed on key up
        begin();
        update((current) => ({
          ...current,
          layers: current.layers.map((l) =>
            l.id === id ? moveLayer(l, arrow[0] * step, arrow[1] * step) : l
          ),
        }));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (arrows[e.key]) {
        end();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    loadFontList();
  }, []);

  const ensureFont = useCallback(
    async (family: string) => {
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
    },
    [t]
  );

  const startWithImage = useCallback(
    async (item: { path: string; name?: string }) => {
      setLoading(true);
      try {
        const img = await loadImage(item.path);
        images.set(item.path, img);
        resetHistory();
        setDoc(
          emptyDoc({
            width: img.naturalWidth,
            height: img.naturalHeight,
            src: item.path,
            mime: isJpeg(item.path) ? 'image/jpeg' : 'image/png',
            name: item.name,
          })
        );
      } catch (e) {
        toaster.show(
          t('editor_image_load_failed', "Couldn't load this image for editing"),
          'warning'
        );
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (media) {
      startWithImage(media);
    }
  }, []);

  const startBlank = useCallback(() => {
    resetHistory();
    setDoc(
      emptyDoc({
        width: Math.min(MAX_SIZE, Math.max(16, Math.round(blankWidth))),
        height: Math.min(MAX_SIZE, Math.max(16, Math.round(blankHeight))),
        color: blankColor,
      })
    );
  }, [blankWidth, blankHeight, blankColor]);

  const pickImages = useCallback(
    (onPick: (items: any[]) => void) => {
      pickerOpen.current = true;
      modals.openModal({
        title: t('media_library', 'Media Library'),
        askClose: false,
        closeOnEscape: true,
        fullScreen: true,
        size: mediaLibrarySize(),
        height: mediaLibrarySize(),
        children: (close) => (
          <PickerScope onUnmount={() => (pickerOpen.current = false)}>
            <MediaBox type="image" setMedia={onPick} closeModal={close} />
          </PickerScope>
        ),
      });
    },
    [t]
  );

  const addOverlays = useCallback(
    async (items: { path: string }[]) => {
      const current = docRef.current;
      if (!current) {
        return;
      }
      const area = visibleRect(current);
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
            x: area.x + (area.w - w) / 2,
            y: area.y + (area.h - h) / 2,
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
      if (!layers.length) {
        return;
      }
      commit((d) => ({ ...d, layers: [...d.layers, ...layers] }));
      setTool('select');
      setSelectedId(layers[layers.length - 1].id);
    },
    [t]
  );

  const addText = useCallback(async () => {
    const current = docRef.current;
    if (!current) {
      return;
    }
    await ensureFont(FONTS[0]);
    const layer = newTextLayer(
      current,
      FONTS[0],
      t('editor_your_text', 'Your text')
    );
    commit((d) => ({ ...d, layers: [...d.layers, layer] }));
    setTool('select');
    setSelectedId(layer.id);
  }, [ensureFont, t]);

  const changeTool = useCallback((next: EditorTool) => {
    const current = docRef.current;
    if (next === 'crop' && current) {
      setCropRatio(undefined);
      setCropDraft(current.crop || fullRect(current));
    }
    if (next === 'draw' && current) {
      setDrawSize(Math.max(2, Math.round(compSize(current).w / 150)));
    }
    setTool(next);
  }, []);

  const applyCrop = useCallback(() => {
    if (cropDraft && cropDraft.w >= 10 && cropDraft.h >= 10) {
      commit((d) => {
        const full = fullRect(d);
        const isFull =
          Math.round(cropDraft.w) === Math.round(full.w) &&
          Math.round(cropDraft.h) === Math.round(full.h);
        return { ...d, crop: isFull ? undefined : cropDraft };
      });
    }
    setTool('select');
  }, [cropDraft]);

  const shapeCreated = useCallback((id: string) => {
    setTool('select');
    setSelectedId(id);
  }, []);

  const rotate = useCallback((by: 90 | -90) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) {
      return;
    }
    setTool('select');
    commit((d) => rotateDoc(ctx, d, by));
  }, []);

  const save = useCallback(async () => {
    end();
    const current = docRef.current;
    if (!current) {
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        current.layers
          .filter((l): l is TextLayer => l.kind === 'text')
          .map((l) => loadGoogleFont(l.font))
      );
      const area = visibleRect(current);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(area.w));
      canvas.height = Math.max(1, Math.round(area.h));
      renderDoc(canvas.getContext('2d')!, current, images, area);

      let output = canvas;
      const outputWidth = current.outputWidth
        ? Math.min(MAX_SIZE, Math.max(16, Math.round(current.outputWidth)))
        : canvas.width;
      if (outputWidth !== canvas.width) {
        output = document.createElement('canvas');
        output.width = outputWidth;
        output.height = Math.max(
          1,
          Math.round((canvas.height * outputWidth) / canvas.width)
        );
        const ctx = output.getContext('2d')!;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, output.width, output.height);
      }

      const type = current.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, type, 0.92)
      );
      if (!blob) {
        throw new Error('Could not export the canvas');
      }
      const base = current.name
        ? `${current.name.replace(/\.[^.]+$/, '')}-edited`
        : 'design';
      const formData = new FormData();
      formData.append(
        'file',
        blob,
        `${base}.${type === 'image/jpeg' ? 'jpg' : 'png'}`
      );
      const response = await fetch('/media/upload-simple', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      const data = await response.json();
      setMedia([{ id: data.id, path: data.path }]);
      modals.closeCurrent();
    } catch (e) {
      toaster.show(
        t('editor_save_failed', "Couldn't save the image, please try again"),
        'warning'
      );
    } finally {
      setSaving(false);
    }
  }, [setMedia, t]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <div className="animate-spin h-[30px] w-[30px] border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex gap-[20px] p-[20px] mobile:flex-col">
        <div className="flex-1 flex flex-col gap-[16px] p-[20px] rounded-[12px] bg-newBgColorInner">
          <div className="text-[18px] font-[600]">
            {t('editor_blank_canvas', 'Blank canvas')}
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {PRESETS.map((preset) => (
              <ToolButton
                key={preset.label}
                active={blankWidth === preset.w && blankHeight === preset.h}
                onClick={() => {
                  setBlankWidth(preset.w);
                  setBlankHeight(preset.h);
                }}
              >
                {preset.label}
              </ToolButton>
            ))}
          </div>
          <div className="flex gap-[12px] items-end">
            <Field label={t('width', 'Width')}>
              <NumberInput
                className="w-[110px]"
                value={blankWidth}
                min={16}
                max={MAX_SIZE}
                onValue={setBlankWidth}
              />
            </Field>
            <Field label={t('height', 'Height')}>
              <NumberInput
                className="w-[110px]"
                value={blankHeight}
                min={16}
                max={MAX_SIZE}
                onValue={setBlankHeight}
              />
            </Field>
            <Field label={t('editor_background', 'Background')}>
              <input
                type="color"
                className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                value={blankColor}
                onChange={(e) => setBlankColor(e.target.value)}
              />
            </Field>
          </div>
          <div>
            <button
              type="button"
              onClick={startBlank}
              disabled={!blankWidth || !blankHeight}
              className="h-[44px] px-[20px] rounded-[8px] bg-[#612BD3] text-white disabled:opacity-50"
            >
              {t('editor_create', 'Create')}
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[16px] p-[20px] rounded-[12px] bg-newBgColorInner">
          <div className="text-[18px] font-[600]">
            {t('editor_from_library', 'From your library')}
          </div>
          <div className="text-[14px] text-newTextColor/70">
            {t(
              'editor_from_library_description',
              'Edit an image you have uploaded. The original stays untouched; the edit is saved as a new copy.'
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                pickImages((items) =>
                  items[0] &&
                  startWithImage({
                    path: items[0].path,
                    name: items[0].originalName || items[0].name,
                  })
                )
              }
              className="h-[44px] px-[20px] rounded-[8px] bg-btnSimple changeColor"
            >
              {t('editor_pick_image', 'Pick an image')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selected = doc.layers.find((l) => l.id === selectedId);
  const visible = visibleRect(doc);
  const outputWidth = doc.outputWidth || Math.round(visible.w);
  const outputHeight = Math.round((visible.h * outputWidth) / visible.w);
  const live = { onFocus: begin, onBlur: end };
  const liveRange = {
    onPointerDown: begin,
    onKeyDown: begin,
    onPointerUp: end,
    onKeyUp: end,
    onBlur: end,
  };

  return (
    <div className="flex flex-col gap-[12px] w-full">
      <div className="flex flex-wrap gap-[8px] items-center">
        <ToolButton active={tool === 'select'} onClick={() => changeTool('select')}>
          {t('editor_select', 'Select')}
        </ToolButton>
        <ToolButton onClick={addText}>{t('editor_add_text', 'Add text')}</ToolButton>
        <ToolButton active={tool === 'draw'} onClick={() => changeTool('draw')}>
          {t('editor_draw', 'Draw')}
        </ToolButton>
        <ToolButton active={tool === 'shape'} onClick={() => changeTool('shape')}>
          {t('editor_shapes', 'Shapes')}
        </ToolButton>
        <ToolButton onClick={() => pickImages(addOverlays)}>
          {t('editor_add_image', 'Add image')}
        </ToolButton>
        <ToolButton active={tool === 'crop'} onClick={() => changeTool('crop')}>
          {t('editor_crop', 'Crop')}
        </ToolButton>
        <ToolButton onClick={() => rotate(-90)}>↺ {t('editor_rotate', 'Rotate')}</ToolButton>
        <ToolButton onClick={() => rotate(90)}>↻ {t('editor_rotate', 'Rotate')}</ToolButton>
        <ToolButton
          disabled={!doc.src}
          onClick={() => commit((d) => ({ ...d, flipX: !d.flipX }))}
        >
          ⇋ {t('editor_flip', 'Flip')}
        </ToolButton>
        <ToolButton
          disabled={!doc.src}
          onClick={() => commit((d) => ({ ...d, flipY: !d.flipY }))}
        >
          ⇵ {t('editor_flip', 'Flip')}
        </ToolButton>
        <div className="flex-1" />
        {(['fit', 0.5, 1, 2] as const).map((value) => (
          <ToolButton key={value} active={zoom === value} onClick={() => setZoom(value)}>
            {value === 'fit' ? t('editor_fit', 'Fit') : `${value * 100}%`}
          </ToolButton>
        ))}
        {zoom !== 'fit' && ![0.5, 1, 2].includes(zoom) && (
          <span className="text-[13px] px-[4px]">{Math.round(zoom * 100)}%</span>
        )}
        <ToolButton disabled={!canUndo} onClick={undo}>
          {t('editor_undo', 'Undo')}
        </ToolButton>
        <ToolButton disabled={!canRedo} onClick={redo}>
          {t('editor_redo', 'Redo')}
        </ToolButton>
      </div>

      <div className="flex gap-[16px] mobile:flex-col">
        <div className="flex-1 flex items-center justify-center rounded-[8px] bg-newBgColorInner p-[12px] h-[calc(100vh-280px)] min-h-[360px] min-w-0">
          <EditorCanvas
            doc={doc}
            images={images}
            tool={tool}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBegin={beginStep}
            onUpdate={update}
            onEnd={end}
            cropDraft={cropDraft}
            onCropDraft={setCropDraft}
            cropRatio={cropRatio}
            drawColor={drawColor}
            drawSize={drawSize}
            shape={shape}
            onShapeCreated={shapeCreated}
            zoom={zoom}
            onZoom={setZoom}
            fontsVersion={fontsVersion}
          />
        </div>

        <div className="w-[300px] mobile:w-full flex flex-col gap-[12px] overflow-y-auto h-[calc(100vh-280px)] min-h-[360px] mobile:h-auto">
          {tool === 'crop' && (
            <Section title={t('editor_crop', 'Crop')}>
              <div className="flex flex-wrap gap-[6px]">
                {RATIOS.map((ratio) => (
                  <ToolButton
                    key={ratio.label}
                    active={cropRatio === ratio.value}
                    onClick={() => {
                      setCropRatio(ratio.value);
                      setCropDraft(ratioRect(doc, ratio.value));
                    }}
                  >
                    {ratio.value ? ratio.label : t('editor_free', 'Free')}
                  </ToolButton>
                ))}
              </div>
              <div className="text-[12px] text-newTextColor/70">
                {t('editor_crop_hint', 'Drag on the image to draw the crop area.')}
              </div>
              <div className="flex gap-[6px]">
                <ToolButton active={true} onClick={applyCrop}>
                  {t('editor_apply', 'Apply')}
                </ToolButton>
                <ToolButton
                  onClick={() => {
                    setCropRatio(undefined);
                    setCropDraft(fullRect(doc));
                  }}
                >
                  {t('editor_reset', 'Reset')}
                </ToolButton>
                <ToolButton onClick={() => setTool('select')}>
                  {t('cancel', 'Cancel')}
                </ToolButton>
              </div>
            </Section>
          )}

          {tool === 'draw' && (
            <Section title={t('editor_draw', 'Draw')}>
              <div className="flex gap-[12px] items-end">
                <Field label={t('editor_colour', 'Colour')}>
                  <input
                    type="color"
                    className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                    value={drawColor}
                    onChange={(e) => setDrawColor(e.target.value)}
                  />
                </Field>
                <Field label={`${t('editor_brush_size', 'Brush size')}: ${drawSize}`}>
                  <input
                    type="range"
                    className="w-[180px] accent-[#612BD3]"
                    min={1}
                    max={100}
                    value={drawSize}
                    onChange={(e) => setDrawSize(Number(e.target.value))}
                  />
                </Field>
              </div>
            </Section>
          )}

          {tool === 'shape' && (
            <Section title={t('editor_shapes', 'Shapes')}>
              <div className="flex flex-wrap gap-[6px]">
                {(
                  [
                    ['rect', t('editor_rectangle', 'Rectangle')],
                    ['ellipse', t('editor_ellipse', 'Ellipse')],
                    ['line', t('editor_line', 'Line')],
                    ['arrow', t('editor_arrow', 'Arrow')],
                  ] as const
                ).map(([kind, label]) => (
                  <ToolButton key={kind} active={shape === kind} onClick={() => setShape(kind)}>
                    {label}
                  </ToolButton>
                ))}
              </div>
              <div className="text-[12px] text-newTextColor/70">
                {t(
                  'editor_shape_hint',
                  'Drag on the canvas to draw. Hold Shift for squares, circles and 45° lines.'
                )}
              </div>
            </Section>
          )}

          {tool === 'select' && selected?.kind === 'shape' && (
            <Section title={t('editor_shape', 'Shape')}>
              {(selected.shape === 'rect' || selected.shape === 'ellipse') && (
                <div className="flex gap-[12px] items-end">
                  <Field label={t('editor_fill', 'Fill')}>
                    <input
                      type="color"
                      className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                      value={selected.fill}
                      {...live}
                      onChange={(e) => updateLayer(selected.id, { fill: e.target.value })}
                    />
                  </Field>
                  <Field label={`${t('editor_opacity', 'Opacity')}: ${selected.fillOpacity}%`}>
                    <input
                      type="range"
                      className="w-[180px] accent-[#612BD3]"
                      min={0}
                      max={100}
                      value={selected.fillOpacity}
                      {...liveRange}
                      onChange={(e) =>
                        updateLayer(selected.id, { fillOpacity: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              )}
              <div className="flex gap-[12px] items-end">
                <Field label={t('editor_outline', 'Outline')}>
                  <input
                    type="color"
                    className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                    value={selected.stroke}
                    {...live}
                    onChange={(e) => updateLayer(selected.id, { stroke: e.target.value })}
                  />
                </Field>
                <Field label={`${t('editor_width', 'Width')}: ${selected.strokeWidth}`}>
                  <input
                    type="range"
                    className="w-[180px] accent-[#612BD3]"
                    min={selected.shape === 'line' || selected.shape === 'arrow' ? 1 : 0}
                    max={100}
                    value={selected.strokeWidth}
                    {...liveRange}
                    onChange={(e) =>
                      updateLayer(selected.id, { strokeWidth: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            </Section>
          )}

          {tool === 'select' && selected?.kind === 'text' && (
            <Section title={t('editor_text', 'Text')}>
              <textarea
                className="min-h-[70px] p-[10px] rounded-[8px] bg-newBgColor border border-newColColor text-[13px] outline-none focus:border-[#612BD3]"
                value={selected.text}
                {...live}
                onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
              />
              <div className="text-[12px] text-newTextColor/70">
                {t('editor_text_hint', 'Tip: double-click the text on the canvas to type there.')}
              </div>
              <Field label={t('editor_font', 'Font')}>
                <div className="max-h-[180px] overflow-y-auto rounded-[8px] border border-newColColor">
                  {FONTS.map((font) => (
                    <div
                      key={font}
                      onClick={async () =>
                        (await ensureFont(font)) &&
                        commitLayer(selected.id, { font })
                      }
                      style={{ fontFamily: `"${font}", sans-serif` }}
                      className={clsx(
                        'px-[10px] py-[6px] text-[15px] cursor-pointer text-textColor',
                        selected.font === font
                          ? 'bg-[#612BD3] text-white'
                          : 'hover:bg-boxHover'
                      )}
                    >
                      {font}
                    </div>
                  ))}
                </div>
              </Field>
              <div className="flex gap-[6px]">
                <input
                  className={clsx(inputClass, 'flex-1 min-w-0')}
                  placeholder={t('editor_other_font', 'Other Google Font')}
                  value={customFont}
                  onChange={(e) => setCustomFont(e.target.value)}
                />
                <ToolButton
                  disabled={!customFont.trim()}
                  onClick={async () =>
                    (await ensureFont(customFont)) &&
                    commitLayer(selected.id, { font: customFont.trim() })
                  }
                >
                  {t('editor_use', 'Use')}
                </ToolButton>
              </div>
              <div className="flex gap-[12px] items-end">
                <Field label={t('editor_size', 'Size')}>
                  <NumberInput
                    className="w-[80px]"
                    min={6}
                    max={2000}
                    value={selected.size}
                    {...live}
                    onValue={(size) => updateLayer(selected.id, { size })}
                  />
                </Field>
                <Field label={t('editor_colour', 'Colour')}>
                  <input
                    type="color"
                    className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                    value={selected.color}
                    {...live}
                    onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-[6px]">
                <ToolButton
                  active={selected.bold}
                  onClick={() => commitLayer(selected.id, { bold: !selected.bold })}
                >
                  <span className="font-[700]">B</span>
                </ToolButton>
                <ToolButton
                  active={selected.italic}
                  onClick={() => commitLayer(selected.id, { italic: !selected.italic })}
                >
                  <span className="italic">I</span>
                </ToolButton>
                {(['left', 'center', 'right'] as const).map((align) => (
                  <ToolButton
                    key={align}
                    active={selected.align === align}
                    onClick={() => commitLayer(selected.id, { align })}
                  >
                    {align === 'left'
                      ? t('editor_left', 'Left')
                      : align === 'center'
                      ? t('editor_centre', 'Centre')
                      : t('editor_right', 'Right')}
                  </ToolButton>
                ))}
              </div>
              <div className="flex gap-[12px] items-end">
                <Field label={t('editor_outline', 'Outline')}>
                  <input
                    type="color"
                    className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                    value={selected.outlineColor}
                    {...live}
                    onChange={(e) =>
                      updateLayer(selected.id, { outlineColor: e.target.value })
                    }
                  />
                </Field>
                <Field label={`${t('editor_width', 'Width')}: ${selected.outlineWidth}`}>
                  <input
                    type="range"
                    className="w-[180px] accent-[#612BD3]"
                    min={0}
                    max={30}
                    value={selected.outlineWidth}
                    {...liveRange}
                    onChange={(e) =>
                      updateLayer(selected.id, { outlineWidth: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <div className="flex gap-[12px] items-end">
                <Field label={t('editor_background', 'Background')}>
                  <input
                    type="color"
                    className="w-[36px] h-[36px] bg-transparent cursor-pointer"
                    value={selected.bgColor}
                    {...live}
                    onChange={(e) => updateLayer(selected.id, { bgColor: e.target.value })}
                  />
                </Field>
                <div className="flex flex-col gap-[6px] flex-1">
                  <Field label={`${t('editor_opacity', 'Opacity')}: ${selected.bgOpacity}%`}>
                    <input
                      type="range"
                      className="w-full accent-[#612BD3]"
                      min={0}
                      max={100}
                      value={selected.bgOpacity}
                      {...liveRange}
                      onChange={(e) =>
                        updateLayer(selected.id, { bgOpacity: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label={`${t('editor_padding', 'Padding')}: ${selected.bgPadding}`}>
                    <input
                      type="range"
                      className="w-full accent-[#612BD3]"
                      min={0}
                      max={200}
                      value={selected.bgPadding}
                      {...liveRange}
                      onChange={(e) =>
                        updateLayer(selected.id, { bgPadding: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {tool === 'select' && selected && (
            <Section title={t('editor_layer', 'Layer')}>
              <Field label={`${t('editor_opacity', 'Opacity')}: ${selected.opacity}%`}>
                <input
                  type="range"
                  className="w-full accent-[#612BD3]"
                  min={0}
                  max={100}
                  value={selected.opacity}
                  {...liveRange}
                  onChange={(e) =>
                    updateLayer(selected.id, { opacity: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label={`${t('editor_rotation', 'Rotation')}: ${selected.rotation}°`}>
                <input
                  type="range"
                  className="w-full accent-[#612BD3]"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  {...liveRange}
                  onDoubleClick={() => commitLayer(selected.id, { rotation: 0 })}
                  onChange={(e) =>
                    updateLayer(selected.id, { rotation: Number(e.target.value) })
                  }
                />
              </Field>
              <div className="flex flex-wrap gap-[6px]">
                {(
                  [
                    ['front', t('editor_to_front', 'To front')],
                    ['forward', t('editor_forward', 'Forward')],
                    ['backward', t('editor_backward', 'Backward')],
                    ['back', t('editor_to_back', 'To back')],
                  ] as const
                ).map(([to, label]) => (
                  <ToolButton key={to} onClick={() => reorderLayer(selected.id, to)}>
                    {label}
                  </ToolButton>
                ))}
              </div>
              <div className="flex flex-wrap gap-[6px]">
                <ToolButton onClick={() => duplicateLayer(selected.id)}>
                  {t('editor_duplicate', 'Duplicate')}
                </ToolButton>
                <ToolButton onClick={() => removeLayer(selected.id)}>
                  <span className="text-[#FF3F3F]">
                    {t('editor_delete_layer', 'Delete layer')}
                  </span>
                </ToolButton>
              </div>
            </Section>
          )}

          {tool === 'select' && !selected && !!doc.src && (
            <Section title={t('editor_adjust', 'Adjust')}>
              {(
                [
                  // canvas filters are missing in some browsers (Safari)
                  ...(supportsFilters()
                    ? [
                        ['brightness', t('editor_brightness', 'Brightness'), 0, 200],
                        ['contrast', t('editor_contrast', 'Contrast'), 0, 200],
                        ['saturation', t('editor_saturation', 'Saturation'), 0, 200],
                      ]
                    : []),
                  ['warmth', t('editor_warmth', 'Warmth'), -100, 100],
                  ['fade', t('editor_fade', 'Fade'), 0, 100],
                  ['vignette', t('editor_vignette', 'Vignette'), 0, 100],
                  ...(supportsFilters()
                    ? [['sharpen', t('editor_sharpen', 'Sharpen'), 0, 100]]
                    : []),
                ] as [Adjustment, string, number, number][]
              ).map(([key, label, min, max]) => (
                <Field key={key} label={`${label}: ${doc[key]}`}>
                  <input
                    type="range"
                    className="w-full accent-[#612BD3]"
                    min={min}
                    max={max}
                    value={doc[key]}
                    {...liveRange}
                    onDoubleClick={() =>
                      commit((d) => ({ ...d, [key]: NEUTRAL_ADJUSTMENTS[key] }))
                    }
                    onChange={(e) =>
                      update((d) => ({ ...d, [key]: Number(e.target.value) }))
                    }
                  />
                </Field>
              ))}
              <div>
                <ToolButton
                  onClick={() => commit((d) => ({ ...d, ...NEUTRAL_ADJUSTMENTS }))}
                >
                  {t('editor_reset', 'Reset')}
                </ToolButton>
              </div>
            </Section>
          )}

          <Section title={t('editor_output_size', 'Output size')}>
            <div className="flex gap-[8px] items-center text-[13px]">
              <NumberInput
                className="w-[100px]"
                min={16}
                max={MAX_SIZE}
                value={outputWidth}
                {...live}
                onValue={(value) =>
                  update((d) => ({ ...d, outputWidth: value }))
                }
              />
              <span>× {outputHeight}px</span>
            </div>
          </Section>
        </div>
      </div>

      <div className="flex justify-end gap-[8px]">
        <button
          type="button"
          onClick={closeModal}
          className="h-[44px] px-[20px] rounded-[8px] border border-newTextColor/10"
        >
          {t('cancel', 'Cancel')}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-[44px] px-[20px] rounded-[8px] bg-[#612BD3] text-white disabled:opacity-50"
        >
          {saving ? t('editor_saving', 'Saving…') : t('editor_save', 'Save to library')}
        </button>
      </div>
    </div>
  );
};

export default MediaEditor;
