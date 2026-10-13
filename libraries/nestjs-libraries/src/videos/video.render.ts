import { createReadStream, statSync, unlinkSync } from 'fs';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { IUploadProvider } from '@gitroom/nestjs-libraries/upload/upload.interface';
import { ffmpegPlan, ResolvedEdit, SourceProbe } from './video.ffmpeg';

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
  const output = join(tmpdir(), `postiz-edit-${Date.now()}.mp4`);
  try {
    const plan = ffmpegPlan(resolved);
    const args = ['-y', '-hide_banner'];
    for (const input of plan.inputs) {
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
    try {
      unlinkSync(output);
    } catch {
      // the encode failed before the file existed
    }
  }
};
