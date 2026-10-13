'use client';

import { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  EditorLayer,
  isLineShape,
  LayerOrder,
  MAX_SIZE,
  svgColors,
} from '@gitroom/frontend/components/media/editor/media.editor.canvas';
import { editorShapes } from '@gitroom/frontend/components/media/editor/media.editor.shapes';
import {
  ColorInput,
  Field,
  inputClass,
  NumberInput,
  Section,
  ToolButton,
} from '@gitroom/frontend/components/media/editor/media.editor.ui';
import { EditorIcon } from '@gitroom/frontend/components/media/editor/media.editor.icons';

export const FONTS = [
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
export const loadGoogleFont = (family: string) => {
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
export const loadFontList = () => {
  fontList =
    fontList ||
    addStylesheet(
      `https://fonts.googleapis.com/css2?${FONTS.map(
        (f) => `family=${f.replace(/ /g, '+')}`
      ).join('&')}&display=swap`
    );
  return fontList;
};

// lets the editor ignore its shortcuts while the library picker is on top
export const PickerScope: FC<{ onUnmount: () => void; children: ReactNode }> = ({
  onUnmount,
  children,
}) => {
  useEffect(() => onUnmount, []);
  return <>{children}</>;
};

// the file is read here and never uploaded, the media library does not take svgs
export const SvgInsert: FC<{ onInsert: (markup: string) => boolean; close: () => void }> = ({
  onInsert,
  close,
}) => {
  const t = useT();
  const [markup, setMarkup] = useState('');
  const insert = (value: string) => onInsert(value) && close();
  return (
    <div className="flex flex-col gap-[16px] w-[560px] max-w-full">
      <label className="self-start h-[44px] px-[20px] rounded-[8px] bg-btnSimple changeColor flex items-center gap-[8px] cursor-pointer">
        <EditorIcon name="upload" />
        {t('editor_svg_upload', 'Upload an SVG file')}
        <input
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) {
              insert(await file.text());
            }
          }}
        />
      </label>
      <Field label={t('editor_svg_paste', 'Or paste SVG code')}>
        <textarea
          className="min-h-[200px] p-[10px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[12px] font-mono outline-none focus:border-[#612BD3]"
          spellCheck={false}
          placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'}
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!markup.trim()}
          onClick={() => insert(markup)}
          className="h-[44px] px-[20px] rounded-[8px] bg-[#612BD3] text-white disabled:opacity-50 flex items-center gap-[8px]"
        >
          <EditorIcon name="plus" />
          {t('editor_insert', 'Insert')}
        </button>
      </div>
    </div>
  );
};

export const DrawSection: FC<{
  color: string;
  size: number;
  swatches: string[];
  onColor: (color: string) => void;
  onSize: (size: number) => void;
}> = ({ color, size, swatches, onColor, onSize }) => {
  const t = useT();
  return (
    <Section title={t('editor_draw', 'Draw')}>
      <div className="flex gap-[12px] items-end">
        <Field label={t('editor_colour', 'Colour')}>
          <ColorInput value={color} swatches={swatches} onChange={onColor} />
        </Field>
        <Field label={`${t('editor_brush_size', 'Brush size')}: ${size}`}>
          <input
            type="range"
            className="w-[180px] accent-[#612BD3]"
            min={1}
            max={100}
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          />
        </Field>
      </div>
    </Section>
  );
};

export const ShapesSection: FC<{ onPick: (markup: string) => void }> = ({ onPick }) => {
  const t = useT();
  return (
    <Section title={t('editor_shapes', 'Shapes')}>
      <div className="grid grid-cols-6 gap-[6px]">
        {editorShapes.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.name}
            aria-label={item.name}
            className="aspect-square w-full rounded-[8px] bg-btnSimple p-[5px] text-textColor hover:bg-[#612BD3] hover:text-white"
            onClick={() => onPick(item.markup)}
          >
            <span
              className="block h-full w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{
                __html: item.markup.split('#000000').join('currentColor'),
              }}
            />
          </button>
        ))}
      </div>
      <div className="text-[12px] text-newTextColor/70">
        {t(
          'editor_shape_hint',
          'Click a shape to place it. Drag on the picture to draw a rectangle. Hold Shift for a square.'
        )}
      </div>
    </Section>
  );
};

// focus and blur, or pointer and key down and up, bracket one undo step
export interface LiveHandlers {
  onFocus: () => void;
  onBlur: () => void;
}
export interface LiveRangeHandlers {
  onPointerDown: () => void;
  onKeyDown: () => void;
  onPointerUp: () => void;
  onKeyUp: () => void;
  onBlur: () => void;
}

// the settings of the selected layer, shared by the image and video editors
export const LayerPanels: FC<{
  selected: EditorLayer;
  swatches: string[];
  live: LiveHandlers;
  liveRange: LiveRangeHandlers;
  updateLayer: (id: string, fields: Partial<EditorLayer>) => void;
  commitLayer: (id: string, fields: Partial<EditorLayer>) => void;
  setLayerSize: (id: string, side: 'w' | 'h', value: number, locked: boolean) => void;
  ensureFont: (family: string) => Promise<boolean>;
  reorderLayer: (id: string, to: LayerOrder) => void;
  duplicateLayer: (id: string) => void;
  removeLayer: (id: string) => void;
}> = ({
  selected,
  swatches,
  live,
  liveRange,
  updateLayer,
  commitLayer,
  setLayerSize,
  ensureFont,
  reorderLayer,
  duplicateLayer,
  removeLayer,
}) => {
  const t = useT();
  const [keepRatio, setKeepRatio] = useState(true);
  const [customFont, setCustomFont] = useState('');
  const svgMarkup = selected.kind === 'svg' ? selected.markup : undefined;
  const svgPalette = useMemo(
    () => (svgMarkup ? svgColors(svgMarkup) : undefined),
    [svgMarkup]
  );
  const sized =
    selected.kind !== 'text' && selected.kind !== 'stroke' ? selected : undefined;

  return (
    <>
      {selected.kind === 'shape' && (
        <Section title={t('editor_shape', 'Shape')}>
          {(selected.shape === 'rect' || selected.shape === 'ellipse') && (
            <div className="flex gap-[12px] items-end">
              <Field label={t('editor_fill', 'Fill')}>
                <ColorInput
                  value={selected.fill}
                  swatches={swatches}
                  {...live}
                  onChange={(fill) => updateLayer(selected.id, { fill })}
                  onCommit={(fill) => commitLayer(selected.id, { fill })}
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
              <ColorInput
                value={selected.stroke}
                swatches={swatches}
                {...live}
                onChange={(stroke) => updateLayer(selected.id, { stroke })}
                onCommit={(stroke) => commitLayer(selected.id, { stroke })}
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

      {selected.kind === 'svg' && svgPalette && (
        <Section title={t('editor_svg', 'SVG')}>
          {(
            [
              ['fill', 'fills', 'fillOpacities', t('editor_fill', 'Fill')],
              ['stroke', 'strokes', 'strokeOpacities', t('editor_stroke', 'Stroke')],
            ] as const
          ).map(([paint, field, opacityField, label]) => {
            const colors = svgPalette[paint];
            if (!colors.length) {
              return null;
            }
            // the All row passes every colour, a colour row just its own
            const row = (key: string, forColors: string[]) => {
              const color = selected[field][forColors[0]] || forColors[0];
              const opacity = selected[opacityField][forColors[0]] ?? 100;
              const each = <T,>(current: Record<string, T>, value: T) => ({
                ...current,
                ...Object.fromEntries(forColors.map((c) => [c, value])),
              });
              const setColor = (value: string, final: boolean) =>
                (final ? commitLayer : updateLayer)(selected.id, {
                  [field]: each(selected[field], value),
                });
              const setOpacity = (value: number, final: boolean) =>
                (final ? commitLayer : updateLayer)(selected.id, {
                  [opacityField]: each(selected[opacityField], value),
                });
              return (
                <div key={key} className="flex items-center gap-[8px]">
                  <ColorInput
                    value={color}
                    swatches={swatches}
                    {...live}
                    onChange={(value) => setColor(value, false)}
                    onCommit={(value) => setColor(value, true)}
                  />
                  <input
                    type="range"
                    aria-label={`${label} ${
                      forColors.length > 1 ? t('editor_all_colours', 'All colours') : color
                    } ${t('editor_opacity', 'Opacity')}`}
                    className="flex-1 min-w-0 accent-[#612BD3]"
                    min={0}
                    max={100}
                    value={opacity}
                    {...liveRange}
                    onDoubleClick={() => setOpacity(100, true)}
                    onChange={(e) => setOpacity(Number(e.target.value), false)}
                  />
                  <span className="text-[12px] w-[36px] text-end">{opacity}%</span>
                </div>
              );
            };
            return (
              <Field key={paint} as="div" label={label}>
                <div className="flex flex-col gap-[6px]">
                  {/* gradients can hold many colours, the All row changes every one */}
                  {colors.slice(0, 24).map((color) => row(color, [color]))}
                </div>
                {colors.length > 1 && (
                  <Field as="div" label={t('editor_all_colours', 'All colours')}>
                    {row('all', colors)}
                  </Field>
                )}
              </Field>
            );
          })}
          {svgPalette.stroke.length ? (
            <Field label={`${t('editor_stroke_width', 'Stroke width')}: ${selected.strokeScale}%`}>
              <input
                type="range"
                className="w-full accent-[#612BD3]"
                min={0}
                max={500}
                step={5}
                value={selected.strokeScale}
                {...liveRange}
                onDoubleClick={() => commitLayer(selected.id, { strokeScale: 100 })}
                onChange={(e) =>
                  updateLayer(selected.id, { strokeScale: Number(e.target.value) })
                }
              />
            </Field>
          ) : (
            <div className="flex gap-[12px] items-end">
              <Field label={t('editor_outline', 'Outline')}>
                <ColorInput
                  value={selected.outline}
                  swatches={swatches}
                  {...live}
                  onChange={(outline) => updateLayer(selected.id, { outline })}
                  onCommit={(outline) => commitLayer(selected.id, { outline })}
                />
              </Field>
              <Field label={`${t('editor_width', 'Width')}: ${selected.outlineWidth}%`}>
                <input
                  type="range"
                  className="w-[150px] accent-[#612BD3]"
                  min={0}
                  max={10}
                  step={0.5}
                  value={selected.outlineWidth}
                  {...liveRange}
                  onChange={(e) =>
                    updateLayer(selected.id, { outlineWidth: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          )}
          <div>
            <ToolButton
              icon="reset"
              onClick={() =>
                commitLayer(selected.id, {
                  fills: {},
                  strokes: {},
                  fillOpacities: {},
                  strokeOpacities: {},
                  strokeScale: 100,
                  outlineWidth: 0,
                })
              }
            >
              {t('editor_reset', 'Reset')}
            </ToolButton>
          </div>
        </Section>
      )}

      {selected.kind === 'text' && (
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
              icon="check"
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
              <ColorInput
                value={selected.color}
                swatches={swatches}
                {...live}
                onChange={(color) => updateLayer(selected.id, { color })}
                onCommit={(color) => commitLayer(selected.id, { color })}
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
            {(
              [
                ['left', 'alignLeft', t('editor_left', 'Left')],
                ['center', 'alignCentre', t('editor_centre', 'Centre')],
                ['right', 'alignRight', t('editor_right', 'Right')],
              ] as const
            ).map(([align, icon, label]) => (
              <ToolButton
                key={align}
                icon={icon}
                active={selected.align === align}
                onClick={() => commitLayer(selected.id, { align })}
              >
                {label}
              </ToolButton>
            ))}
          </div>
          <div className="flex gap-[12px] items-end">
            <Field label={t('editor_outline', 'Outline')}>
              <ColorInput
                value={selected.outlineColor}
                swatches={swatches}
                {...live}
                onChange={(outlineColor) => updateLayer(selected.id, { outlineColor })}
                onCommit={(outlineColor) => commitLayer(selected.id, { outlineColor })}
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
              <ColorInput
                value={selected.bgColor}
                swatches={swatches}
                {...live}
                onChange={(bgColor) => updateLayer(selected.id, { bgColor })}
                onCommit={(bgColor) => commitLayer(selected.id, { bgColor })}
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

      <Section title={t('editor_layer', 'Layer')}>
        {sized && (
          <div className="flex flex-wrap gap-[8px] items-end">
            {(['w', 'h'] as const).map((side) => (
              <Field key={side} label={side === 'w' ? t('width', 'Width') : t('height', 'Height')}>
                <NumberInput
                  className="w-[90px]"
                  min={isLineShape(sized) ? 0 : 1}
                  max={MAX_SIZE * 2}
                  value={Math.round(Math.abs(sized[side]))}
                  {...live}
                  onValue={(value) =>
                    setLayerSize(sized.id, side, value, keepRatio && sized.kind !== 'shape')
                  }
                />
              </Field>
            ))}
            {/* shapes are sized freely, photos and svgs would stretch */}
            {sized.kind !== 'shape' && (
              <ToolButton
                icon="link"
                active={keepRatio}
                onClick={() => setKeepRatio(!keepRatio)}
              >
                {t('editor_keep_ratio', 'Keep ratio')}
              </ToolButton>
            )}
          </div>
        )}
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
              ['front', 'toFront', t('editor_to_front', 'To front')],
              ['forward', 'forward', t('editor_forward', 'Forward')],
              ['backward', 'backward', t('editor_backward', 'Backward')],
              ['back', 'toBack', t('editor_to_back', 'To back')],
            ] as const
          ).map(([to, icon, label]) => (
            <ToolButton key={to} icon={icon} onClick={() => reorderLayer(selected.id, to)}>
              {label}
            </ToolButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-[6px]">
          <ToolButton icon="duplicate" onClick={() => duplicateLayer(selected.id)}>
            {t('editor_duplicate', 'Duplicate')}
          </ToolButton>
          <ToolButton onClick={() => removeLayer(selected.id)}>
            <span className="text-[#FF3F3F] flex items-center gap-[6px]">
              <EditorIcon name="trash" />
              {t('editor_delete_layer', 'Delete layer')}
            </span>
          </ToolButton>
        </div>
      </Section>
    </>
  );
};
