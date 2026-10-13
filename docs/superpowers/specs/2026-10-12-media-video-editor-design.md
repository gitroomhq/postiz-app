# Media video editor

## Goal

Edit uploaded MP4 and MOV files on a short timeline and save a new MP4 to
the media library. The original is never modified. There is no saved
project: closing the editor discards the edit. Save is the only thing that
keeps the work.

Preview plays the source files in the browser. ffmpeg runs once, in a
background job, when the user saves. No new npm dependencies. No auto
captions, transitions, filters, stickers, or speed changes.

## Entry

**Media library tile → Edit** (pencil on hover, standalone library page).
Shown for `.mp4` and `.mov`. Opens the editor with that file as the first
clip. Save adds a new library item and refreshes the grid.

The post composer and provider settings do not grow a video editor in this
version. The image editor is unchanged.

## Editor

One video track and one music track, under a preview.

- **Clips.** Add more `.mp4` and `.mov` files from the library. Drag to
  reorder. Drag the edges to trim. Split cuts the clip under the playhead
  into two, and does nothing when the playhead is outside a clip or within
  0.1s of either edge. Delete removes a clip. A clip cannot be shorter than
  0.1s. Each clip has its own audio and a mute control.
- **Titles.** Add a title, type it, and drag it on the preview. Drag its
  start and end on the timeline. Font is one of Inter, Roboto, Montserrat,
  Poppins. Size is in output pixels, colour is `#rrggbb`, alignment is left,
  centre or right around the title's centre point. No animation. A title
  with no text is ignored.
- **Music.** One track. Upload an MP3, M4A or WAV, or pick an audio file
  already in the library. Drag it along the timeline and set its volume
  from 0 to 100. It mixes under the clip audio and is cut when the video
  ends. It does not make the video longer.
- **Frame.** Either the first clip's size, or a fixed shape: 1:1
  (1080×1080), 4:5 (1080×1350), 9:16 (1080×1920), 16:9 (1920×1080). Every
  clip is scaled to cover that frame and cropped, which can scale a smaller
  source up. In a fixed shape, one drag on the preview chooses the crop for
  the whole video. With the first clip's size, the crop stays centred and
  the frame is that clip's size reduced so the short side is at most 1080px
  and the long side at most 1920px.
- **Undo.** In-memory snapshots, same shortcut as the image editor
  (Ctrl/⌘+Z). Not sent to the server.

The finished timeline cannot run past 15 minutes (900 seconds), the
existing upload cap. Save is disabled when there are no clips or the
timeline is longer than that.

### Preview

Clips are `<video>` elements, music is one `<audio>` element, titles are
drawn on top. Nothing is re-encoded.

Chrome often cannot decode `.mov`. When the browser cannot read a file's
duration, the editor calls `GET /media/:id/probe` (ffprobe, same
organization only) and uses the returned duration, width and height. The
timeline still works. The preview shows that this browser cannot play the
file. The exported MP4 does not depend on that.

### What is sent on save

Times are seconds.

- **clips:** media id, in-point, out-point, muted. Array order is the
  timeline order.
- **titles:** text, start, end, position (0–1 of the frame, anchored at the
  text's centre), font, size, colour, alignment.
- **music:** media id, source in-point, timeline start, volume. Absent when
  there is no music.
- **frame:** `original`, or a ratio plus one crop position (0–1, 0–1).

Every media id must belong to the same organization. Anything else is
rejected before a job starts.

## Save

1. The API creates a new media row, type `video`, status `rendering`,
   original name `<first clip name> edited.mp4` (the source extension is
   replaced). `path` is empty until the file exists. The item is not
   playable yet.
2. A new workflow, `renderVideoEditWorkflow`, runs the encode. Its input is
   the new media id and the edit document above. `processMediaWorkflow` is
   not changed. The encode activity takes those two arguments and is not
   given a second shape later; a change means a new activity and a new
   workflow.
3. The activity runs ffmpeg, writes the MP4 into storage, and marks the row
   `ready` with its path and size. One attempt. The activity timeout is 20
   minutes.
4. The library already hides `processing` (upload normalization) and shows
   every other status, so a `rendering` row appears immediately. The grid
   refetches while any visible item is `rendering`. The tile shows that it
   is rendering and does not try to play a missing file. The user can close
   the editor while it runs.

The MP4 is H.264, high profile, `yuv420p`, AAC at 128 kbps and 48 kHz, with
the moov atom at the front. Those are the upload video rules. Frame rate
follows the first clip and is at most 60.

Titles are burned in with the same four fonts the picker offers. The fonts
are installed in the image. A missing font file falls back to Inter.

Clip audio is kept, except a muted clip, which contributes silence for its
span. Music is mixed underneath and trimmed to the video.

## ffmpeg

The image that runs the orchestrator must have `ffmpeg` and `ffprobe` on
`PATH`. For the published app that is `Dockerfile.overlay`: install them in
the final stage. A missing binary fails the new item with that reason.

## Music files

MP3, M4A and WAV upload as media of type `audio`. They are not sent through
video normalization. They show in the library so they can be picked again.
The pencil is not shown on them. Deleting one does not change a video
already exported.

## Errors

- A source clip or the music file was deleted, or is not in this
  organization: the new item is `failed` and `processingError` says which
  file was missing.
- ffmpeg is missing, or the encode fails: the new item is `failed` with the
  ffmpeg error, trimmed so it fits the existing error column. The originals
  stay.
- A failed or rendering item can be deleted like any other library file.
- A music upload that fails shows a toast and does not add the track.
- The editor stays open after a rejected save.

## Out of scope

Auto captions, transitions, filters, stickers, speed, per-clip crop,
reopening an edit, and a video editor in the post composer.

## Testing

Manual QA in the dev app: open an MP4, trim, split, reorder, add a second
clip, add a title, add music, mute a clip, export a fixed 9:16 frame, and
confirm the new library item plays and the original is unchanged. Repeat
the export with a `.mov`. Confirm Save is disabled past 15 minutes. Confirm
a failed encode leaves a failed tile and the source files in place.
Frontend type-check. New editor files are copied in `Dockerfile.overlay`,
and that image has ffmpeg.
