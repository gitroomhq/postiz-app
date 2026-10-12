# Native Media Image Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Polotno with a dependency-free canvas editor that edits library images (or a blank canvas) and saves the result as a new library item.

**Architecture:** A layer document (`EditorDoc`: base + image/text/stroke layers + crop + output width) held in the editor shell with snapshot undo. A canvas component renders the document and turns pointer input into document updates. Saving renders the document offscreen and uploads through the existing `POST /media/upload-simple`.

**Tech Stack:** React 19, Next.js, Tailwind 3, HTML canvas 2D (`ctx.filter`), Google Fonts CSS2 API loaded at runtime.

## Global Constraints

- No new npm dependencies; `polotno` stays in `package.json`.
- Frontend only; no backend, DB or workflow changes.
- Saving never modifies the original media; it always uploads a new file.
- User-facing strings go through `useT()` with English defaults.
- Use existing Tailwind tokens (`bg-newBgColorInner`, `border-newColColor`, `bg-btnSimple`, `#612BD3`); no `--color-custom*`.
- Every new or modified frontend file is listed in `Dockerfile.overlay`.

---

### Task 1: Canvas renderer and interactions

**Files:**
- Create: `apps/frontend/src/components/media/editor/media.editor.canvas.tsx`

**Interfaces:**
- Produces: `EditorDoc`, `EditorLayer`, `TextLayer`, `ImageLayer`, `StrokeLayer`, `EditorTool`, `Rect`, `compSize(doc)`, `renderDoc(ctx, doc, images, opts)`, `fullRect(doc)`, `ratioRect(doc, ratio)`, `loadImage(src)`, and the `EditorCanvas` component with props `{ doc, images, tool, selectedId, onSelect, onBegin, onUpdate, onEnd, cropDraft, onCropDraft, cropRatio, drawColor, drawSize, fontsVersion }`.

- [ ] Render base (rotate/flip in screen axes, brightness/contrast/saturation via `ctx.filter`), layers in order, crop offset.
- [ ] Text: multi-line, Google font, bold/italic, alignment, outline (`strokeText` under `fillText`), background box with opacity and padding.
- [ ] Select tool: hit test top-down, drag to move, bottom-right handle resizes images (ratio kept) and text (font size); strokes move only.
- [ ] Draw tool: pointer stroke appended live, committed on pointer up.
- [ ] Crop tool: shows the full composition, drag draws a rect constrained to the ratio, dark overlay outside it.
- [ ] Verify: lint clean.

### Task 2: Editor shell

**Files:**
- Create: `apps/frontend/src/components/media/editor/media.editor.tsx`

**Interfaces:**
- Consumes: everything from Task 1; `MediaBox` from `media.component.tsx`; `useFetch`, `useToaster`, `useModals`, `useT`, `useLaunchStore`.
- Produces: default export `MediaEditor: FC<{ setMedia(media: {id: string; path: string}[]): void; closeModal(): void; width?: number; height?: number; media?: { path: string; name?: string } }>`.

- [ ] Start screen: blank presets / custom size / colour, or pick from library (images only).
- [ ] History: `begin` / `update` / `end` / `commit` / `undo` with a 50-step cap; Ctrl/⌘+Z and Delete/Backspace outside inputs.
- [ ] Toolbar: Select, Add text, Draw, Add image, Crop, rotate left/right, flip H/V, Undo.
- [ ] Panels: adjustments, text properties (curated Google Fonts list in their own face plus a free-text family, size, colour, bold, italic, align, outline, background), draw colour/size, crop ratios with Apply / Reset / Cancel, output width, delete layer.
- [ ] Fonts: load CSS2 with all four styles, fall back to the plain family, confirm a matching `FontFace` exists, toast if not.
- [ ] Save: offscreen render, optional scale to output width, JPEG for JPEG/WebP bases else PNG, upload, `setMedia`, close. Toasts on load/upload errors.
- [ ] Verify: lint clean.

### Task 3: Wire entry points and remove Polotno

**Files:**
- Modify: `apps/frontend/src/components/media/media.component.tsx`
- Delete: `apps/frontend/src/components/launches/polonto.tsx`, `apps/frontend/src/components/launches/polonto/polonto.picture.generation.tsx`

- [ ] Replace the `Polonto` dynamic import with `MediaEditor` in `designMedia` and `showDesignModal` (passing `width` / `height`).
- [ ] Library tiles: pencil Edit button on hover (standalone, not in select mode, images only) opening the editor with that media; save refreshes the grid and toasts.
- [ ] Verify: frontend type-check (`tsc --noEmit -p apps/frontend`) has no new errors in touched files; manual QA of all three entry points in the dev app.

### Task 4: Ship

**Files:**
- Modify: `Dockerfile.overlay`

- [ ] Add both editor files to the overlay COPY list.
- [ ] Pattern review subagent against existing code.
- [ ] Commit and push; watch the GHCR publish run.
