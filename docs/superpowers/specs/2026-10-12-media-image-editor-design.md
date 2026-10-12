# Native media image editor (replaces Polotno)

## Goal

Edit uploaded images (or design from a blank canvas) inside Postiz and save
the result back to the media library. Replaces the Polotno editor everywhere.
No new npm dependencies.

## Entry points

1. **Media library tile → Edit** (pencil on hover, images only, standalone
   library page). Opens the editor with that image. Save uploads a new copy
   and refreshes the grid. The original is never modified.
2. **Post composer → Design media.** Opens the start screen. Save attaches
   the result to the post (same `setMedia` contract as Polotno).
3. **Provider settings `MediaComponent` → Editor.** Start screen; the blank
   canvas defaults to the field's `width` × `height`. Save fills the field.

**Start screen:** "Blank canvas" (presets 1080×1080, 1080×1350, 1080×1920,
1920×1080, or custom; background colour) or "Pick from library" (media
picker filtered to images).

## Editor

One `<canvas>` rendering an ordered layer list:

- **Base:** the photo or blank colour. Flip H / flip V and
  brightness / contrast / saturation apply to the base only. Rotate 90°
  turns the canvas and carries every layer to its new position. The Adjust
  section is hidden in browsers without canvas filter support.
- **Image overlay:** library image, movable and resizable.
- **Text:** content, Google Font family, size, colour, bold, italic,
  alignment (left / centre / right, multi-line), outline (colour, width),
  background box (colour, opacity, padding). Movable.
- **Stroke:** freehand drawing, colour and brush size.

Tools: Add text (placed in the centre, then dragged), Select (click to
select, drag to move, corner handle to resize,
Delete/Backspace removes), Text, Draw, Add image, Crop (free, 1:1, 4:5, 16:9,
9:16; crops the composition, layers stay editable), Resize (output width,
height follows ratio), Undo (Ctrl/⌘+Z, snapshot based).

### Fonts

Curated list of ~30 Google Fonts shown in their own face, plus an "Other
Google Font" text box. Loaded on demand from `fonts.googleapis.com/css2`
(regular, bold, italic, bold italic) and awaited with `document.fonts.load`
before drawing. Unknown family → toast, text keeps its previous font.

## Save

Canvas export: JPEG (0.92) when the base is a JPEG photo, PNG otherwise
(WebP and PNG may carry transparency).
Filename `<original>-edited.<ext>` (`design.png` for blank). Uploaded via the
existing `POST /media/upload-simple`; no backend change.

## Errors

- Image cannot be loaded or makes the canvas unreadable (cross-origin
  without CORS, e.g. old `localhost:4007` paths) → toast; editor stays usable.
- Upload fails → toast; edits are kept.

## Removed / unchanged

- `components/launches/polonto.tsx` and `polonto/polonto.picture.generation.tsx`
  are deleted (AI generation side panel goes with them; the composer's
  separate "AI Image" button stays).
- `polotno` stays in `package.json` for now (removing it changes the lockfile
  and forces a full install in the GHCR overlay build). Its leftovers
  (`polonto.css` import in `global.scss`, `plontoKey` / `NEXT_PUBLIC_POLOTNO`)
  are unused and can go in the same cleanup.
- Existing gating on the Design media button (`user.tier.ai`) is unchanged.

## Testing

Manual QA in the dev app for each entry point, lint, and frontend type-check.
New files are added to `Dockerfile.overlay`.
