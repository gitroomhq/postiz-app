'use client';

import { FC, ReactNode, useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  Adjustment,
  EditorLayer,
  MAX_SIZE,
  parseSvg,
  PresetLayer,
} from '@gitroom/frontend/components/media/editor/media.editor.canvas';
import {
  Field,
  inputClass,
  Section,
  ToolButton,
} from '@gitroom/frontend/components/media/editor/media.editor.ui';

export interface EditorPreset {
  name: string;
  adjustments: Partial<Record<Adjustment, number>>;
  cropRatio?: number;
  outputWidth?: number;
  layers: PresetLayer[];
}

export interface BrandKit {
  colors: string[];
  logos: string[];
  font?: string;
}

const PRESETS_KEY = 'postiz-editor-presets';
const BRAND_KEY = 'postiz-editor-brand';
const GRID_KEY = 'postiz-editor-grid';
const MAX_COLORS = 12;

// imported files and stored values are rebuilt field by field, anything unexpected is dropped
const isColor = (v: any): v is string =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

const isText = (v: any): v is string => typeof v === 'string';

const num = (v: any, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

const ADJUSTMENT_RANGES: Record<Adjustment, [number, number]> = {
  brightness: [0, 200],
  contrast: [0, 200],
  saturation: [0, 200],
  warmth: [-100, 100],
  fade: [0, 100],
  vignette: [0, 100],
  sharpen: [0, 100],
};

const toLayer = (l: any): EditorLayer | undefined => {
  // presets store layers scaled to a canvas 1 unit wide
  const pos = (v: any) => num(v, -100, 100);
  const base = {
    id: makeId(10),
    opacity: num(l?.opacity, 0, 100) ?? 100,
    rotation: num(l?.rotation, -180, 180) ?? 0,
  };
  const x = pos(l?.x);
  const y = pos(l?.y);
  switch (l?.kind) {
    case 'image': {
      const w = num(l.w, 0, 100);
      const h = num(l.h, 0, 100);
      return isText(l.src) && x !== undefined && y !== undefined && w && h
        ? { ...base, kind: 'image', src: l.src, x, y, w, h }
        : undefined;
    }
    case 'text': {
      const size = num(l.size, 0, 100);
      return isText(l.text) && isText(l.font) && l.font.trim() && x !== undefined && y !== undefined && size
        ? {
            ...base,
            kind: 'text',
            x,
            y,
            size,
            text: l.text,
            font: l.font.trim(),
            color: isColor(l.color) ? l.color : '#FFFFFF',
            bold: !!l.bold,
            italic: !!l.italic,
            align: ['left', 'center', 'right'].includes(l.align) ? l.align : 'center',
            outlineColor: isColor(l.outlineColor) ? l.outlineColor : '#000000',
            outlineWidth: num(l.outlineWidth, 0, 100) ?? 0,
            bgColor: isColor(l.bgColor) ? l.bgColor : '#000000',
            bgOpacity: num(l.bgOpacity, 0, 100) ?? 0,
            bgPadding: num(l.bgPadding, 0, 100) ?? 0,
          }
        : undefined;
    }
    case 'stroke': {
      const points = Array.isArray(l.points) ? l.points.map(pos) : [];
      return points.length >= 2 && points.length % 2 === 0 && points.every((p: any) => p !== undefined)
        ? {
            ...base,
            kind: 'stroke',
            points,
            color: isColor(l.color) ? l.color : '#FF3F3F',
            width: num(l.width, 0, 100) ?? 0.01,
          }
        : undefined;
    }
    case 'shape': {
      const w = pos(l.w);
      const h = pos(l.h);
      return ['rect', 'ellipse', 'line', 'arrow'].includes(l.shape) &&
        x !== undefined &&
        y !== undefined &&
        w !== undefined &&
        h !== undefined
        ? {
            ...base,
            kind: 'shape',
            shape: l.shape,
            x,
            y,
            w,
            h,
            fill: isColor(l.fill) ? l.fill : '#612BD3',
            fillOpacity: num(l.fillOpacity, 0, 100) ?? 0,
            stroke: isColor(l.stroke) ? l.stroke : '#FFFFFF',
            strokeWidth: num(l.strokeWidth, 0, 100) ?? 0,
          }
        : undefined;
    }
    case 'svg': {
      const svg = isText(l.markup) ? parseSvg(l.markup) : undefined;
      const w = num(l.w, 0, 100);
      const h = num(l.h, 0, 100);
      const colors = (v: any): Record<string, string> =>
        Object.fromEntries(
          Object.entries(v && typeof v === 'object' ? v : {}).filter(
            ([from, to]) => isColor(from) && isColor(to)
          )
        ) as Record<string, string>;
      return svg && x !== undefined && y !== undefined && w && h
        ? {
            ...base,
            kind: 'svg',
            markup: svg.markup,
            x,
            y,
            w,
            h,
            fills: colors(l.fills),
            strokes: colors(l.strokes),
            strokeScale: num(l.strokeScale, 0, 500) ?? 100,
            outline: isColor(l.outline) ? l.outline : '#000000',
            outlineWidth: num(l.outlineWidth, 0, 100) ?? 0,
          }
        : undefined;
    }
  }
  return undefined;
};

const toPreset = (p: any): EditorPreset | undefined => {
  if (!isText(p?.name) || !p.name.trim()) {
    return undefined;
  }
  const adjustments: Partial<Record<Adjustment, number>> = {};
  for (const key of Object.keys(ADJUSTMENT_RANGES) as Adjustment[]) {
    const value = num(p.adjustments?.[key], ...ADJUSTMENT_RANGES[key]);
    if (value !== undefined) {
      adjustments[key] = value;
    }
  }
  const layers: PresetLayer[] = [];
  for (const item of Array.isArray(p.layers) ? p.layers : []) {
    const layer = toLayer(item?.layer);
    const centreY = num(item?.centreY, -100, 100);
    if (layer && centreY !== undefined) {
      layers.push({ layer, centreY });
    }
  }
  return {
    name: p.name.trim(),
    adjustments,
    cropRatio: num(p.cropRatio, 0.01, 100) || undefined,
    outputWidth: num(p.outputWidth, 16, MAX_SIZE) || undefined,
    layers,
  };
};

const toPresets = (list: any): EditorPreset[] => {
  const byName = new Map<string, EditorPreset>();
  for (const preset of Array.isArray(list) ? list.map(toPreset) : []) {
    if (preset) {
      byName.set(preset.name, preset);
    }
  }
  return Array.from(byName.values());
};

const toBrandKit = (b: any): BrandKit => ({
  colors: Array.isArray(b?.colors)
    ? Array.from(new Set<string>(b.colors.filter(isColor).map((c: string) => c.toLowerCase()))).slice(
        0,
        MAX_COLORS
      )
    : [],
  logos: Array.isArray(b?.logos) ? Array.from(new Set<string>(b.logos.filter(isText))) : [],
  font: isText(b?.font) && b.font.trim() ? b.font.trim() : undefined,
});

const isEmptyKit = (b: BrandKit) => !b.colors.length && !b.logos.length && !b.font;

const read = <T,>(key: string, parse: (value: any) => T): T => {
  try {
    return parse(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch (e) {
    return parse(null);
  }
};

// state kept in this browser's localStorage; the setter returns false if it could not be stored
const useStoredState = <T,>(key: string, parse: (value: any) => T) => {
  const t = useT();
  const toaster = useToaster();
  const [value, setValue] = useState<T>(() => read(key, parse));
  const current = useRef(value);
  const update = useCallback(
    (fn: (value: T) => T) => {
      const next = fn(current.current);
      current.current = next;
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
        return true;
      } catch (e) {
        toaster.show(
          t('editor_storage_full', 'Could not save in this browser, the storage may be full'),
          'warning'
        );
        return false;
      }
    },
    [key, t]
  );
  return [value, update] as const;
};

export const usePresets = () => useStoredState(PRESETS_KEY, toPresets);

export const useBrandKit = () => useStoredState(BRAND_KEY, toBrandKit);

export interface GridSettings {
  show: boolean;
  // image pixels, not screen pixels
  size: number;
}

const toGrid = (g: any): GridSettings => ({
  show: !!g?.show,
  size: Math.round(num(g?.size, 4, MAX_SIZE) ?? 100),
});

export const useGrid = () => useStoredState(GRID_KEY, toGrid);

type Store<T> = (fn: (value: T) => T) => boolean;

// always shown on phones, which have no hover
const RemoveBadge: FC<{ onClick: () => void }> = ({ onClick }) => {
  const t = useT();
  return (
    <button
      type="button"
      title={t('editor_remove', 'Remove')}
      onClick={onClick}
      className="hidden group-hover:flex mobile:flex absolute -top-[6px] -end-[6px] w-[14px] h-[14px] rounded-full bg-[#FF3F3F] text-white text-[10px] leading-[14px] items-center justify-center"
    >
      ×
    </button>
  );
};

const PresetRow: FC<{
  preset: EditorPreset;
  onApply: () => void;
  onRename: (name: string) => boolean;
  onDelete: () => void;
}> = ({ preset, onApply, onRename, onDelete }) => {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const finish = () => {
    setRenaming(false);
    if (!name.trim() || name.trim() === preset.name || !onRename(name.trim())) {
      setName(preset.name);
    }
  };
  return (
    <div className="flex items-center gap-[6px]">
      {renaming ? (
        <input
          autoFocus
          className={clsx(inputClass, 'flex-1 min-w-0')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={finish}
          onKeyDown={(e) => e.key === 'Enter' && finish()}
        />
      ) : (
        <div className="flex-1 min-w-0 truncate text-[13px]" title={preset.name}>
          {preset.name}
        </div>
      )}
      <ToolButton active={true} onClick={onApply}>
        {t('editor_apply', 'Apply')}
      </ToolButton>
      <ToolButton onClick={() => setRenaming(true)}>
        {t('editor_rename', 'Rename')}
      </ToolButton>
      <ToolButton onClick={onDelete}>
        <span className="text-[#FF3F3F]">×</span>
      </ToolButton>
    </div>
  );
};

export const PresetsSection: FC<{
  presets: EditorPreset[];
  setPresets: Store<EditorPreset[]>;
  onSave: (name: string) => void;
  onApply: (preset: EditorPreset) => void;
}> = ({ presets, setPresets, onSave, onApply }) => {
  const t = useT();
  const toaster = useToaster();
  const [name, setName] = useState('');

  const rename = (from: string, to: string) => {
    if (presets.some((p) => p.name === to)) {
      toaster.show(
        t('editor_preset_exists', 'A preset called "{{name}}" already exists', {
          name: to,
        }),
        'warning'
      );
      return false;
    }
    return setPresets((list) => list.map((p) => (p.name === from ? { ...p, name: to } : p)));
  };

  const remove = async (preset: EditorPreset) => {
    if (
      await deleteDialog(
        t('editor_delete_preset', 'Delete the preset "{{name}}"?', {
          name: preset.name,
        })
      )
    ) {
      setPresets((list) => list.filter((p) => p.name !== preset.name));
    }
  };

  return (
    <Section title={t('editor_presets', 'Presets')}>
      <div className="flex gap-[6px]">
        <input
          className={clsx(inputClass, 'flex-1 min-w-0')}
          placeholder={t('editor_preset_name', 'Preset name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <ToolButton
          disabled={!name.trim()}
          onClick={() => {
            onSave(name.trim());
            setName('');
          }}
        >
          {t('editor_save_preset', 'Save')}
        </ToolButton>
      </div>
      {!presets.length && (
        <div className="text-[12px] text-newTextColor/70">
          {t(
            'editor_presets_hint',
            'Save the adjustments, layers, crop ratio and output size of this image, then apply them to other images.'
          )}
        </div>
      )}
      {presets.map((preset) => (
        <PresetRow
          key={preset.name}
          preset={preset}
          onApply={() => onApply(preset)}
          onRename={(to) => rename(preset.name, to)}
          onDelete={() => remove(preset)}
        />
      ))}
    </Section>
  );
};

export const BrandSection: FC<{
  brand: BrandKit;
  setBrand: Store<BrandKit>;
  fonts: string[];
  onInsertLogo: (path: string) => void;
  onPickLogos: (onPick: (paths: string[]) => void) => void;
}> = ({ brand, setBrand, fonts, onInsertLogo, onPickLogos }) => {
  const t = useT();
  const [color, setColor] = useState('#612BD3');
  const fontOptions =
    brand.font && !fonts.includes(brand.font) ? [...fonts, brand.font] : fonts;

  return (
    <Section title={t('editor_brand_kit', 'Brand kit')}>
      <Field as="div" label={t('editor_brand_colours', 'Colours')}>
        <div className="flex flex-wrap items-center gap-[6px]">
          {brand.colors.map((c) => (
            <div key={c} className="relative group">
              <div
                className="w-[24px] h-[24px] rounded-full border border-newTextColor/20"
                style={{ background: c }}
                title={c}
              />
              <RemoveBadge
                onClick={() =>
                  setBrand((b) => ({ ...b, colors: b.colors.filter((x) => x !== c) }))
                }
              />
            </div>
          ))}
          <input
            type="color"
            className="w-[30px] h-[30px] bg-transparent cursor-pointer"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <ToolButton
            disabled={
              brand.colors.length >= MAX_COLORS ||
              brand.colors.includes(color.toLowerCase())
            }
            onClick={() =>
              setBrand((b) => ({ ...b, colors: [...b.colors, color.toLowerCase()] }))
            }
          >
            {t('editor_add', 'Add')}
          </ToolButton>
        </div>
      </Field>
      {/* a <label> would turn a click on a logo into a click on its first button */}
      <Field as="div" label={t('editor_brand_logos', 'Logos (click to add to the image)')}>
        <div className="flex flex-wrap items-center gap-[6px]">
          {brand.logos.map((path) => (
            <div key={path} className="relative group">
              <img
                src={path}
                alt=""
                onClick={() => onInsertLogo(path)}
                className="w-[48px] h-[48px] object-contain rounded-[6px] bg-newBgColor cursor-pointer"
              />
              <RemoveBadge
                onClick={() =>
                  setBrand((b) => ({ ...b, logos: b.logos.filter((x) => x !== path) }))
                }
              />
            </div>
          ))}
          <ToolButton
            onClick={() =>
              onPickLogos((paths) =>
                setBrand((b) => ({
                  ...b,
                  logos: [...b.logos, ...paths.filter((p) => !b.logos.includes(p))],
                }))
              )
            }
          >
            {t('editor_add_logo', 'Add logo')}
          </ToolButton>
        </div>
      </Field>
      <Field label={t('editor_default_font', 'Font for new text')}>
        <select
          className={inputClass}
          value={brand.font || fonts[0]}
          onChange={(e) => setBrand((b) => ({ ...b, font: e.target.value }))}
        >
          {fontOptions.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </Field>
    </Section>
  );
};

export const BackupSection: FC<{
  presets: EditorPreset[];
  setPresets: Store<EditorPreset[]>;
  brand: BrandKit;
  setBrand: Store<BrandKit>;
}> = ({ presets, setPresets, brand, setBrand }) => {
  const t = useT();
  const toaster = useToaster();
  const file = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ presets, brand }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'postiz-editor-presets.json';
    link.click();
    // revoking straight away cancels the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (selected?: File) => {
    if (!selected) {
      return;
    }
    try {
      const data = JSON.parse(await selected.text());
      const imported = toPresets(data?.presets);
      const kit = toBrandKit(data?.brand);
      if (!imported.length && isEmptyKit(kit)) {
        throw new Error('Nothing to import');
      }
      const names = imported.map((p) => p.name);
      const stored =
        (!imported.length ||
          setPresets((list) => [...list.filter((p) => !names.includes(p.name)), ...imported])) &&
        (isEmptyKit(kit) || setBrand(() => kit));
      if (stored) {
        toaster.show(
          isEmptyKit(kit)
            ? t('editor_import_presets', 'Imported {{count}} presets', {
                count: imported.length,
              })
            : t('editor_import_presets_brand', 'Imported {{count}} presets and the brand kit', {
                count: imported.length,
              }),
          'success'
        );
      }
    } catch (e) {
      toaster.show(
        t('editor_import_failed', 'This file is not a Postiz editor export'),
        'warning'
      );
    }
  };

  return (
    <Section title={t('editor_backup', 'Backup')}>
      <div className="text-[12px] text-newTextColor/70">
        {t(
          'editor_backup_hint',
          'Presets and the brand kit are kept in this browser. Export them to move them to another browser.'
        )}
      </div>
      <div className="flex gap-[6px]">
        <ToolButton onClick={exportFile}>{t('editor_export', 'Export')}</ToolButton>
        <ToolButton onClick={() => file.current?.click()}>
          {t('editor_import', 'Import')}
        </ToolButton>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            importFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </Section>
  );
};
