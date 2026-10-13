# Media video editor implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Edit MP4 and MOV files on a timeline and save a new MP4 without changing the original.

**Architecture:** The browser plays the source files and posts an edit document. A new Temporal workflow runs ffmpeg once and stores a new media row. Upload normalization (`processMediaWorkflow`) is not changed.

**Tech Stack:** Existing NestJS media API, Temporal orchestrator, ffmpeg/ffprobe, React timeline. No new npm dependencies.

## Global Constraints

- No auto captions, transitions, filters, stickers, speed changes, per-clip crop, saved projects, or a composer entry.
- Output is H.264 high, yuv420p, AAC 128 kbps 48 kHz, faststart. Fixed frames are 1080×1080, 1080×1350, 1080×1920, 1920×1080. Original is the first clip, capped at 1080 short side and 1920 long side.
- Timeline max 900 seconds. Clips at least 0.1 seconds.
- Fonts: Inter, Roboto, Montserrat, Poppins. Missing font file falls back to Inter.
- `renderVideoEdit` activity arguments are `(mediaId, edit)` and stay that shape.
- Library list keeps hiding `processing`. `rendering` and `failed` stay visible. Public API and MCP keep mapping their existing fields only.
- Audio uploads (mp3, m4a, wav) are allowed and are not normalized.

---

### Task 1: Edit document

**Files:**
- Create: `libraries/nestjs-libraries/src/videos/video.edit.ts`
- Test: `libraries/nestjs-libraries/src/videos/video.edit.spec.ts`

Pure `parseVideoEdit` and `frameSize`. Rejects another organization only later, in the service.

### Task 2: ffmpeg argument builder

**Files:**
- Create: `libraries/nestjs-libraries/src/videos/video.ffmpeg.ts`
- Test: `libraries/nestjs-libraries/src/videos/video.ffmpeg.spec.ts`

`ffmpegPlan` returns inputs, a filter graph, and output args. Cover-crop, mute as silence, drawtext, one music mix. No process spawn here.

### Task 3: Encode and probe

**Files:**
- Create: `libraries/nestjs-libraries/src/videos/video.render.ts`
- Modify: `libraries/nestjs-libraries/src/database/prisma/media/media.repository.ts`
- Modify: `libraries/nestjs-libraries/src/database/prisma/media/media.service.ts`
- Modify: `libraries/nestjs-libraries/src/upload/custom.upload.validation.ts`

`probeFile` and `renderEdit` spawn ffprobe/ffmpeg. The service checks the organization, creates a `rendering` row, and starts `renderVideoEditWorkflow`.

### Task 4: Workflow and routes

**Files:**
- Create: `apps/orchestrator/src/workflows/render.video.edit.workflow.ts`
- Modify: `apps/orchestrator/src/workflows/index.ts`
- Modify: `apps/orchestrator/src/activities/media.activity.ts`
- Modify: `apps/backend/src/api/routes/media.controller.ts`
- Create: `libraries/nestjs-libraries/src/dtos/media/video.edit.dto.ts`

`GET /media/:id/probe` and `POST /media/video-edit`, declared before the upload catch-all.

### Task 5: Timeline editor and library

**Files:**
- Create: `apps/frontend/src/components/media/editor/media.video.editor.tsx`
- Modify: `apps/frontend/src/components/media/media.component.tsx`
- Modify: `libraries/react-shared-libraries/src/translation/locales/en/translation.json`
- Modify: `Dockerfile.overlay`

Pencil on mp4 and mov. Rendering and failed tiles. Audio tiles. Timeline: trim, split, reorder, titles, music, frame, undo, save.
