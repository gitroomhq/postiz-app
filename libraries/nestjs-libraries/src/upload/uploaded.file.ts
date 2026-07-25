import { createReadStream, mkdirSync, promises as fsp } from 'fs';
import { tmpdir } from 'os';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer, fromFile } = require('file-type');

/**
 * An upload arrives in one of two shapes: held in memory, or spooled to disk.
 *
 * Memory is the default and is fine for the sizes multipart uploads leave us —
 * but when the browser posts the whole file to us instead of to storage
 * directly, a single 1 GB video would be read into RAM in full before anything
 * gets to check its size. In a 4 GB container marked oom_score_adj 100, that is
 * an authenticated user's way of restarting the app.
 *
 * So the server-side path spools to disk, and everything downstream reads the
 * file through the helpers here rather than reaching for `.buffer` and finding
 * `undefined`.
 */

/** Where spooled uploads live until they have been handed to storage. */
export function uploadTempDir(): string {
  return process.env.UPLOAD_TMP_DIR || tmpdir();
}

/**
 * The ceiling multer enforces *while reading*, so an oversized upload is cut
 * off mid-stream rather than after the fact. It matches the largest type we
 * accept at all (video); CustomFileValidationPipe then narrows it per type —
 * images are held to far less — and rejects what does not belong.
 */
export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

/**
 * Accepts an upload onto disk instead of into memory. Use this wherever the
 * file is posted to us rather than to storage directly.
 */
export function spooledFileInterceptor(field = 'file') {
  return FileInterceptor(field, {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = uploadTempDir();
        try {
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (err) {
          cb(err as Error, dir);
        }
      },
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });
}

/**
 * The declared mime type is never trusted — neither the browser's nor the
 * extension's. This sniffs the real one from the leading bytes, whichever shape
 * the file arrived in.
 */
export async function detectUploadType(
  file: Express.Multer.File
): Promise<{ ext: string; mime: string } | undefined> {
  if (file?.buffer) {
    return fromBuffer(file.buffer);
  }
  if (file?.path) {
    return fromFile(file.path);
  }
  return undefined;
}

/**
 * A body S3 will accept. Spooled files are streamed rather than read, which is
 * the entire point of spooling them — pair it with `uploadLength` below, since
 * a stream body carries no length of its own.
 */
export function uploadBody(file: Express.Multer.File) {
  return file.buffer ?? createReadStream(file.path);
}

export function uploadLength(file: Express.Multer.File): number | undefined {
  return file.buffer ? file.buffer.length : file.size;
}

/**
 * Deleting the spooled file is the caller's job and belongs in a `finally`:
 * multer also leaves one behind when it aborts a request for exceeding the size
 * limit, which is exactly the case where we least want the disk to fill up.
 * Never throws — a failed cleanup must not turn a successful upload into an
 * error response.
 */
export async function discardTempFile(
  file?: Express.Multer.File
): Promise<void> {
  if (!file?.path) {
    return;
  }
  await fsp.unlink(file.path).catch(() => undefined);
}
