# Media image editor improvements

Builds on `2026-10-12-media-image-editor-design.md`. Frontend only: no
backend, database or dependency changes. Delivered in four stages, each
tested and committed separately.

## Stage 1: photo adjustments

New base-photo adjustments next to brightness / contrast / saturation:

- **Warmth** (-100..100): warm (orange) or cool (blue) tint drawn over the
  photo with `soft-light` blending.
- **Fade** (0..100): lifts the blacks with a grey `lighten` wash.
- **Vignette** (0..100): radial gradient darkening the edges (`multiply`).
- **Sharpen** (0..100): SVG `feConvolveMatrix` referenced from `ctx.filter`.

All apply to the base photo only (drawn before the layers). Warmth, fade and
vignette use compositing and work in every browser; sharpen and the three
existing sliders need canvas filters and stay hidden without them. No
built-in filter presets.

## Stage 2: layer tools

- Opacity per layer (0..100).
- Rotation for text, image and shape layers: round handle above the
  selection, Shift snaps to 15°. Hit testing and resizing work in the
  rotated frame.
- Order: to front, forward, backward, to back. Duplicate (offset copy).
- Redo: button, Cmd+Shift+Z / Ctrl+Y; cleared by a new edit.
- Arrow keys nudge the selected layer by 1/400 of the image width, at least
  1px (Shift: ten times that), so the step is visible on large photos. A held
  key is one undo step.

## Stage 3: canvas tools

- Snapping to the canvas centre lines and edges while dragging, with guides
  (hold Alt to move freely).
- Double-click a text layer to edit it in place on the canvas.
- Shapes tool: rectangle, ellipse, line, arrow; fill, outline colour/width,
  opacity, rotation.
- Zoom: Fit / 50% / 100% / 200% and Cmd/Ctrl + scroll; canvas area scrolls.

## Stage 4: saved presets and brand kit (browser storage)

**Presets** store the photo adjustments, all layers (text, image overlays,
shapes, drawings), the crop ratio and the output width. Layer positions are
saved as fractions of the canvas width/height and sizes as fractions of the
width, so they keep their relative placement on images of other sizes.
Applying replaces the adjustments, centres the crop ratio, sets the output
width and adds the layers on top; one undo step. Image layers whose source no
longer loads are skipped with a toast. Panel: save as (name), apply, rename,
delete.

**Brand kit**: colours (swatches beside every colour input), logos (library
images inserted with one click) and a default font for new text.

Both live in `localStorage` (keys `postiz-editor-presets`,
`postiz-editor-brand`). Export downloads one `.json` file with both; import
merges presets by name and replaces the brand kit.
