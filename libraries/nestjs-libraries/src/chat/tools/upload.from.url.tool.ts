import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class UploadFromUrlTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'uploadFromUrlTool';

  run() {
    return createTool({
      id: 'uploadFromUrlTool',
      description: `Upload a remote image or video into the media library from a public http(s) URL.
Local or private files cannot be fetched by this tool: upload them with the Postiz CLI (postiz upload, https://docs.postiz.com/cli/introduction) or the public API (POST /public/v1/upload with an API key, https://docs.postiz.com/public-api/introduction).
Use this before scheduling a post when the user provides an external media URL (not already hosted on our domain),
so the attachment passes the upload-domain validation. Returns the hosted media { id, path, status } to use as an attachment (or as the src of an <img> in the content, when the channel rules say pictures go inside the content), or { error } on failure.
Set adjust to true (off by default) to adjust the media to the platforms' limits after the upload, for media a platform may reject as too large, too small or in an unsupported encoding: videos get their short side scaled to 1080 px (up or down, long side at most 1920 px) and are re-encoded to H.264 MP4 with AAC audio at up to 60 fps; images are only scaled down (short side at most 1080 px, long side at most 1920 px) and keep their format. GIF, AVIF, BMP and TIFF files are stored as uploaded.
Without adjust the status is "ready" and the path can be used immediately. With adjust the status is "processing" until the adjusted file replaces the original at the same path, usually within seconds. Wait until it is "ready" before publishing a post with this path: a post published while it is processing uses the original, unadjusted file. To know when the adjusted file is in place, call mediaStatusTool with the returned id (not uploadWidgetStatusTool, which only covers the upload widget).`,
      mcp: {
        annotations: {
          title: 'Upload Media From URL',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe(
            'The public http(s) URL of the image or video to upload. Local files and private hosts are not supported, use the Postiz CLI (postiz upload) or POST /public/v1/upload instead'
          ),
        adjust: z
          .boolean()
          .optional()
          .describe(
            'Adjust the media to the platforms\' limits (resize and re-encode) after the upload. Defaults to false'
          ),
      }),
      // Mastra validates a tool's return against this schema, so it must also
      // allow the graceful { error } shape. Fields are optional (rather than
      // wrapping everything in an `output` union) to keep the change minimal:
      // the existing { id, path } success return and the new { error } return
      // both validate without rewriting every return statement.
      outputSchema: z.object({
        id: z.string().optional(),
        path: z.string().optional(),
        status: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        try {
          const org = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          );

          return await this._mediaService.uploadFromUrl(
            org.id,
            inputData.url,
            inputData.adjust
          );
        } catch (err) {
          // undici's fetch rejects with a generic TypeError('fetch failed')
          // and hides the real reason (DNS, TLS, SSRF block, ...) in
          // err.cause, which the service wraps once more, so walk the chain
          // and surface it for the agent. Error.cause isn't in the es2020
          // lib typings this repo compiles against, hence the cast
          const message =
            err instanceof Error ? err.message : 'Unexpected error';
          const causes: string[] = [];
          let cause = (err as Error & { cause?: unknown })?.cause;
          while (cause instanceof Error) {
            if (cause.message) {
              causes.push(cause.message);
            }
            cause = (cause as Error & { cause?: unknown }).cause;
          }
          const causeText = causes.length ? ` (${causes.join(': ')})` : '';

          return {
            error: `Failed to upload media from URL: ${message}${causeText}. Only public http(s) URLs work: upload local or private files with the Postiz CLI (postiz upload, https://docs.postiz.com/cli/introduction) or the public API (POST /public/v1/upload with an API key, https://docs.postiz.com/public-api/introduction)`,
          };
        }
      },
    });
  }
}
