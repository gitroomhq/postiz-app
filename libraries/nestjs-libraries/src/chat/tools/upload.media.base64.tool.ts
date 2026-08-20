import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fileTypeFromBuffer } = require('file-type');

// Deliberately narrower than the URL-upload tool's allow-list: this tool only
// ever needs to accept finished Instagram/TikTok images from the caller.
const ALLOWED_MIME = new Set<string>(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB, after base64 decoding
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

// Never used to build a filesystem path (LocalStorage/CloudflareStorage
// generate their own random on-disk name), only echoed back in the tool's
// response — sanitized anyway so nothing path-traversal-shaped ever leaves
// this tool.
const sanitizeFilename = (raw: string, fallbackExt: string): string => {
  const base = (raw || '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
  return base || `upload.${fallbackExt}`;
};

@Injectable()
export class UploadMediaBase64Tool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}
  name = 'uploadMediaBase64';

  run() {
    return createTool({
      id: 'uploadMediaBase64',
      description: `Upload an image into the media library directly from base64-encoded bytes (no public URL required).
Use this for locally generated or sandboxed images that don't have a public HTTPS URL yet (uploadFromUrlTool can't fetch those).
Only PNG, JPEG and WEBP are accepted, up to 12 MB decoded. Returns the hosted media { id, path } to use as an attachment, or { error } on failure.
This tool only uploads media into the library — it never creates, schedules or publishes a post by itself.`,
      mcp: {
        annotations: {
          title: 'Upload Media From Base64',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        filename: z.string().min(1).describe('Original filename, e.g. slide-01.png'),
        mimeType: z
          .enum(['image/png', 'image/jpeg', 'image/webp'])
          .describe('Declared MIME type. The actual file signature is verified independently.'),
        base64Data: z
          .string()
          .min(1)
          .describe('Raw base64 file data, without a data: URL prefix.'),
      }),
      outputSchema: z.object({
        id: z.string().optional(),
        path: z.string().optional(),
        filename: z.string().optional(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        try {
          const org = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          );

          const { filename, mimeType, base64Data } = inputData;

          if (!ALLOWED_MIME.has(mimeType)) {
            return { error: 'Unsupported MIME type.' };
          }

          const trimmed = base64Data.trim();
          if (!trimmed) {
            return { error: 'base64Data is empty.' };
          }
          if (trimmed.startsWith('data:')) {
            return {
              error:
                'base64Data must be raw base64 without a data: URL prefix.',
            };
          }
          if (trimmed.length % 4 !== 0 || !BASE64_PATTERN.test(trimmed)) {
            return { error: 'base64Data is not valid base64.' };
          }

          // Reject before decoding if the base64 length alone already implies
          // the decoded payload would exceed the cap (base64 is ~4/3 the
          // decoded size), so we don't buffer huge invalid payloads first.
          const estimatedDecodedSize = Math.floor((trimmed.length * 3) / 4);
          if (estimatedDecodedSize > MAX_SIZE_BYTES) {
            return {
              error: `File is too large: ~${estimatedDecodedSize} bytes (max ${MAX_SIZE_BYTES} bytes).`,
            };
          }

          const buffer = Buffer.from(trimmed, 'base64');
          if (buffer.length === 0) {
            return { error: 'base64Data decoded to an empty file.' };
          }
          if (buffer.length > MAX_SIZE_BYTES) {
            return {
              error: `File is too large: ${buffer.length} bytes (max ${MAX_SIZE_BYTES} bytes).`,
            };
          }

          // Never trust the caller-declared mimeType/filename extension —
          // sniff the real type from the decoded bytes, same as
          // uploadFromUrlTool and LocalStorage do for every other upload path.
          const detected = await fileTypeFromBuffer(buffer);
          if (!detected || !ALLOWED_MIME.has(detected.mime)) {
            return { error: 'Unsupported file type (signature check failed).' };
          }

          const safeFilename = sanitizeFilename(filename, detected.ext);

          const getFile = await this.storage.uploadFile({
            buffer,
            mimetype: detected.mime,
            size: buffer.length,
            path: '',
            fieldname: '',
            destination: '',
            stream: new Readable(),
            filename: '',
            originalname: safeFilename,
            encoding: '',
          });

          const saved = await this._mediaService.saveFile(
            org.id,
            getFile.originalname,
            getFile.path,
            safeFilename
          );

          return {
            id: saved.id,
            path: saved.path,
            filename: safeFilename,
            mimeType: detected.mime,
            size: buffer.length,
          };
        } catch (err) {
          return {
            error: `Failed to upload media: ${
              err instanceof Error ? err.message : 'Unexpected error'
            }`,
          };
        }
      },
    });
  }
}
