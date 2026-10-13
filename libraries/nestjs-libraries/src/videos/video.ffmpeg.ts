import { editDuration, VideoEdit } from './video.edit';

export interface SourceProbe {
  path: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  hasAudio: boolean;
}

export interface ResolvedEdit {
  edit: VideoEdit;
  clips: SourceProbe[];
  music?: SourceProbe;
  width: number;
  height: number;
}

const fpsOf = (fps: number) => Math.min(60, Math.max(1, Math.round(fps || 30)));

export const ffmpegPlan = (resolved: ResolvedEdit) => {
  const { edit, clips, width, height } = resolved;
  const duration = editDuration(edit);
  const fps = fpsOf(clips[0]?.fps);
  const focusX = edit.shape === 'original' ? 0.5 : edit.focusX;
  const focusY = edit.shape === 'original' ? 0.5 : edit.focusY;
  const filters: string[] = [];

  clips.forEach((clip, index) => {
    const span = edit.clips[index].out - edit.clips[index].in;
    filters.push(
      `[${index}:v]trim=start=${edit.clips[index].in}:end=${edit.clips[index].out},setpts=PTS-STARTPTS,` +
        `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
        `crop=${width}:${height}:(iw-${width})*${focusX}:(ih-${height})*${focusY},` +
        `fps=${fps},format=yuv420p,setsar=1[v${index}]`
    );
    if (clip.hasAudio && !edit.clips[index].muted) {
      filters.push(
        `[${index}:a]atrim=start=${edit.clips[index].in}:end=${edit.clips[index].out},asetpts=PTS-STARTPTS,` +
          `aformat=sample_rates=48000:channel_layouts=stereo,apad=whole_dur=${span},atrim=0:${span}[a${index}]`
      );
    } else {
      filters.push(
        `anullsrc=channel_layout=stereo:sample_rate=48000,atrim=0:${span},asetpts=PTS-STARTPTS[a${index}]`
      );
    }
  });

  const pairs = clips.map((_, index) => `[v${index}][a${index}]`).join('');
  filters.push(`${pairs}concat=n=${clips.length}:v=1:a=1[vcat][acat]`);

  let video = '[vcat]';
  const inputs: { path: string }[] = clips.map((clip) => ({
    path: clip.path,
  }));
  // listed back to front, so later layers are drawn over earlier ones; a still
  // picture is one frame that overlay keeps showing, enable is on the video's clock
  const overlays = edit.overlays || [];
  overlays.forEach((overlay, index) => {
    inputs.push({ path: overlay.path });
    const next = index === overlays.length - 1 ? '[vout]' : `[vo${index}]`;
    filters.push(
      `[${inputs.length - 1}:v]scale=${width}:${height},format=rgba[o${index}]`,
      `${video}[o${index}]overlay=0:0:enable='between(t,${overlay.start},${overlay.end})'${next}`
    );
    video = next;
  });
  if (video === '[vcat]') {
    filters.push(`[vcat]null[vout]`);
  }

  if (resolved.music && edit.music) {
    inputs.push({ path: resolved.music.path });
    const musicIndex = inputs.length - 1;
    const musicSpan = Math.max(0.1, duration - edit.music.start);
    const delay = Math.round(edit.music.start * 1000);
    filters.push(
      `[${musicIndex}:a]atrim=start=${edit.music.in}:end=${edit.music.in + musicSpan},asetpts=PTS-STARTPTS,` +
        `aformat=sample_rates=48000:channel_layouts=stereo,volume=${edit.music.volume / 100},` +
        `adelay=${delay}|${delay}[music]`
    );
    filters.push(`[acat][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`);
  } else {
    filters.push(`[acat]anull[aout]`);
  }

  return {
    inputs,
    filter: filters.join(';'),
    output: [
      '-map',
      '[vout]',
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '23',
      '-r',
      String(fps),
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-movflags',
      '+faststart',
    ],
  };
};
