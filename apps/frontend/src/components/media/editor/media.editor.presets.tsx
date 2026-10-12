'use client';

import { FC, ReactNode, useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import {
  Adjustment,
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
const MAX_COLORS = 12;

const isPreset = (p: any): p is EditorPreset =>
  !!p &&
  typeof p.name === 'string' &&
  !!p.name.trim() &&
  typeof p.adjustments === 'object' &&
  Array.isArray(p.layers) &&
  p.layers.every(
    (l: any) =>
      l && typeof l.centreY === 'number' && typeof l.layer?.kind === 'string'
  );

const toBrandKit = (b: any): BrandKit => ({
  colors: Array.isArray(b?.colors)
    ? b.colors
        .filter((c: any) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))
        .slice(0, MAX_COLORS)
    : [],
  logos: Array.isArray(b?.logos)
    ? b.logos.filter((l: any) => typeof l === 'string')
    : [],
  font: typeof b?.font === 'string' && b.font.trim() ? b.font.trim() : undefined,
});

const toPresets = (list: any): EditorPreset[] =>
  Array.isArray(list) ? list.filter(isPreset) : [];

const read = <T,>(key: string, parse: (value: any) => T): T => {
  try {
    return parse(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch (e) {
    return parse(null);
  }
};

// state kept in this browser's localStorage; the setter reports if it could not be stored
const useStoredState = <T,>(key: string, parse: (value: any) => T) => {
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
        return false;
      }
    },
    [key]
  );
  return [value, update] as const;
};

export const usePresets = () => useStoredState(PRESETS_KEY, toPresets);

export const useBrandKit = () => useStoredState(BRAND_KEY, toBrandKit);

type Store<T> = (fn: (value: T) => T) => boolean;

// not a <label>: a click on a logo would otherwise press the first button inside
const Group: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-[4px] text-[12px] text-newTextColor/70">
    {label}
    {children}
  </div>
);

const PresetRow: FC<{
  preset: EditorPreset;
  onApply: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}> = ({ preset, onApply, onRename, onDelete }) => {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(preset.name);
  const finish = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== preset.name) {
      onRename(name.trim());
    } else {
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
      return;
    }
    setPresets((list) => list.map((p) => (p.name === from ? { ...p, name: to } : p)));
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
      <Group label={t('editor_brand_colours', 'Colours')}>
        <div className="flex flex-wrap items-center gap-[6px]">
          {brand.colors.map((c) => (
            <div key={c} className="relative group">
              <div
                className="w-[24px] h-[24px] rounded-full border border-newTextColor/20"
                style={{ background: c }}
                title={c}
              />
              <button
                type="button"
                title={t('editor_remove', 'Remove')}
                onClick={() =>
                  setBrand((b) => ({ ...b, colors: b.colors.filter((x) => x !== c) }))
                }
                className="hidden group-hover:flex absolute -top-[6px] -end-[6px] w-[14px] h-[14px] rounded-full bg-[#FF3F3F] text-white text-[10px] leading-[14px] items-center justify-center"
              >
                ×
              </button>
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
      </Group>
      <Group label={t('editor_brand_logos', 'Logos (click to add to the image)')}>
        <div className="flex flex-wrap items-center gap-[6px]">
          {brand.logos.map((path) => (
            <div key={path} className="relative group">
              <img
                src={path}
                alt=""
                onClick={() => onInsertLogo(path)}
                className="w-[48px] h-[48px] object-contain rounded-[6px] bg-newBgColor cursor-pointer"
              />
              <button
                type="button"
                title={t('editor_remove', 'Remove')}
                onClick={() =>
                  setBrand((b) => ({ ...b, logos: b.logos.filter((x) => x !== path) }))
                }
                className="hidden group-hover:flex absolute -top-[6px] -end-[6px] w-[14px] h-[14px] rounded-full bg-[#FF3F3F] text-white text-[10px] leading-[14px] items-center justify-center"
              >
                ×
              </button>
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
      </Group>
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
    URL.revokeObjectURL(url);
  };

  const importFile = async (selected?: File) => {
    if (!selected) {
      return;
    }
    try {
      const data = JSON.parse(await selected.text());
      const imported = toPresets(data?.presets);
      if (!imported.length && !data?.brand) {
        throw new Error('Nothing to import');
      }
      const names = imported.map((p) => p.name);
      const stored =
        setPresets((list) => [...list.filter((p) => !names.includes(p.name)), ...imported]) &&
        (!data.brand || setBrand(() => toBrandKit(data.brand)));
      toaster.show(
        stored
          ? t('editor_import_done', 'Imported {{count}} presets', {
              count: imported.length,
            })
          : t('editor_storage_full', 'Could not save in this browser, the storage may be full'),
        stored ? 'success' : 'warning'
      );
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
