import { createReadStream, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { IUploadProvider } from '@gitroom/nestjs-libraries/upload/upload.interface';
import { VideoEditTitle, VideoFont } from './video.edit';
import { ffmpegPlan, fontFile, ResolvedEdit, SourceProbe } from './video.ffmpeg';

const fontData = new Map<VideoFont, string>();
const textAnchor = { left: 'start', center: 'middle', right: 'end' } as const;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// A full-frame transparent image. The ffmpeg build has overlay, not drawtext
const titlePng = async (title: VideoEditTitle, width: number, height: number) => {
  let font = fontData.get(title.font);
  if (!font) {
    const file = fontFile(title.font) || fontFile('Inter');
    font = file ? readFileSync(file).toString('base64') : '';
    fontData.set(title.font, font);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<style>@font-face { font-family: "PostizTitle"; src: url("data:font/ttf;base64,${font}"); }</style>
<text x="${width * title.x}" y="${height * title.y}" text-anchor="${textAnchor[title.align]}" dominant-baseline="middle" font-family="PostizTitle" font-size="${title.size}" fill="${title.color}">${escapeXml(title.text)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

const run = (command: string, args: string[], timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} took too long`));
    }, timeoutMs);
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        new Error(
          err.code === 'ENOENT'
            ? `${command} is not installed`
            : err.message || `${command} failed`
        )
      );
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim().slice(-1500) || `${command} failed`));
      }
    });
  });

// A library path is a public URL for local storage, or a remote URL
export const localMediaPath = (publicPath: string) => {
  const prefix = `${process.env.FRONTEND_URL || ''}/uploads`;
  const dir = process.env.UPLOAD_DIRECTORY || '';
  if (dir && publicPath.startsWith(prefix)) {
    return dir + publicPath.slice(prefix.length);
  }
  return publicPath;
};

const rate = (value?: string) => {
  if (!value || value === '0/0') {
    return 30;
  }
  const [num, den] = value.split('/').map(Number);
  const fps = den ? num / den : num;
  return fps > 0 && fps < 1000 ? fps : 30;
};

export const probeFile = async (path: string): Promise<SourceProbe> => {
  const args = [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    path,
  ];
  const child = spawn('ffprobe', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  const result = await new Promise<string>((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      err = (err + chunk.toString()).slice(-1000);
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(
        new Error(
          error.code === 'ENOENT' ? 'ffprobe is not installed' : error.message
        )
      );
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(out);
      } else {
        reject(new Error(err || 'Could not read this file'));
      }
    });
  });
  const parsed = JSON.parse(result);
  const video = (parsed.streams || []).find((stream: any) => stream.codec_type === 'video');
  const audio = (parsed.streams || []).find((stream: any) => stream.codec_type === 'audio');
  const duration = Number(video?.duration || parsed.format?.duration || 0);
  return {
    path,
    width: Number(video?.width || 0),
    height: Number(video?.height || 0),
    duration,
    fps: rate(video?.r_frame_rate || video?.avg_frame_rate),
    hasAudio: !!audio,
  };
};

export const RENDER_TIMEOUT = 20 * 60 * 1000;

// Encodes the edit to a temp file, stores it, and returns the stored file
export const renderToStorage = async (
  storage: IUploadProvider,
  resolved: ResolvedEdit
) => {
  const titleFiles: string[] = [];
  const output = join(tmpdir(), `postiz-edit-${Date.now()}.mp4`);
  try {
    for (const [index, title] of resolved.edit.titles.entries()) {
      const file = join(tmpdir(), `postiz-title-${process.pid}-${Date.now()}-${index}.png`);
      writeFileSync(file, await titlePng(title, resolved.width, resolved.height));
      titleFiles.push(file);
    }
    const plan = ffmpegPlan(resolved, titleFiles);
    const args = ['-y', '-hide_banner'];
    for (const input of plan.inputs) {
      if (input.duration) {
        args.push('-loop', '1', '-t', String(input.duration));
      }
      args.push('-i', input.path);
    }
    args.push('-filter_complex', plan.filter, ...plan.output, output);
    await run('ffmpeg', args, RENDER_TIMEOUT);
    const size = statSync(output).size;
    const stored = await storage.uploadStream(
      createReadStream(output),
      'video/mp4',
      'mp4'
    );
    return {
      filename: stored.filename as string,
      path: stored.path as string,
      fileSize: Math.min(size, 2147483647),
    };
  } finally {
    for (const file of [output, ...titleFiles]) {
      try {
        unlinkSync(file);
      } catch {
        // the encode failed before the file existed
      }
    }
  }
};
