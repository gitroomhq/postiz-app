import XHRUpload from '@uppy/xhr-upload';
import AwsS3Multipart from '@uppy/aws-s3';
import sha256 from 'sha256';
import Transloadit from '@uppy/transloadit';
import { BasePlugin } from '@uppy/core';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Keeps a file in the "processing" state after it reached the bucket until the
// media normalization workflow marks the record ready, the same way
// Transloadit's waitForEncoding holds the dashboard until the assembly is done.
// Files whose record is already ready (no normalizer, gif, ...) pass through.
// The bytes are already stored, so giving up never fails the upload: the
// original file is used instead.
export class WaitForMediaProcessing extends BasePlugin<any, any, any> {
  constructor(
    uppy: any,
    opts: {
      fetch: any;
      processingMessage: string;
      fallbackMessage: string;
      interval?: number;
      maxWait?: number;
    }
  ) {
    super(uppy, opts);
    this.id = 'WaitForMediaProcessing';
    this.type = 'modifier';
  }

  install() {
    this.uppy.addPostProcessor(this.process);
  }

  uninstall() {
    this.uppy.removePostProcessor(this.process);
  }

  process = async (fileIDs: string[]) => {
    await Promise.all(fileIDs.map((id) => this.waitForFile(id)));
  };

  waitForFile = async (id: string) => {
    const file: any = this.uppy.getFile(id);
    const saved = file?.response?.body?.saved;
    if (saved?.status !== 'processing') {
      return;
    }

    this.uppy.emit('postprocess-progress', file, {
      mode: 'indeterminate',
      message: this.opts.processingMessage,
    });

    const interval = this.opts.interval || 2000;
    const deadline = Date.now() + (this.opts.maxWait || 20 * 60 * 1000);
    let failures = 0;
    let media: any = saved;
    // the file disappears when the user cancels, so stop polling with it
    while (this.uppy.getFile(id) && Date.now() < deadline && failures < 5) {
      await sleep(interval);

      try {
        const response = await (
          await this.opts.fetch(`/media/${saved.id}/status`)
        ).json();
        // a 4xx body has no status; treat it like a failed poll
        if (!response?.status) {
          throw new Error(response?.message || 'Media not found');
        }
        media = response;
        failures = 0;
      } catch (err) {
        failures++;
        continue;
      }

      if (media.status !== 'processing') {
        break;
      }
    }

    const current: any = this.uppy.getFile(id);
    if (!current) {
      return;
    }

    if (media.status !== 'ready') {
      // a file that only existed to be converted has nothing to fall back to
      const usable = /\.(png|jpe?g|gif|webp|mp4)$/i.test(media.name || '');
      if (!usable) {
        this.uppy.info(media.processingError || this.opts.fallbackMessage, 'error', 5000);
        this.uppy.setFileState(id, { error: media.processingError || 'failed' } as any);
        this.uppy.emit('postprocess-complete', this.uppy.getFile(id));
        return;
      }
      this.uppy.info(this.opts.fallbackMessage, 'warning', 5000);
    }

    this.uppy.setFileState(id, {
      response: {
        ...current.response,
        body: { ...current.response.body, saved: media },
      },
    } as any);
    this.uppy.emit('postprocess-complete', this.uppy.getFile(id));
  };
}
const fetchUploadApiEndpoint = async (
  fetch: any,
  endpoint: string,
  data: any
) => {
  const res = await fetch(`/media/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return res.json();
};

// Define the factory to return appropriate Uppy configuration
export const getUppyUploadPlugin = (
  provider: string,
  fetch: any,
  backendUrl: string,
  transloadit: string[] = []
) => {
  switch (provider) {
    case 'transloadit':
      return {
        plugin: Transloadit,
        options: {
          waitForEncoding: true,
          alwaysRunAssembly: true,
          assemblyOptions: {
            params: {
              auth: { key: transloadit[0] },
              template_id: transloadit[1],
            },
          },
        },
      };
    case 'cloudflare':
      return {
        plugin: AwsS3Multipart,
        options: {
          shouldUseMultipart: (file: any) => true,
          endpoint: '',
          createMultipartUpload: async (file: any) => {
            let fileHash = '';
            const contentType = file.type;

            // Skip hash calculation for files larger than 100MB to avoid "Invalid array length" error
            if (file.size <= 100 * 1024 * 1024) {
              try {
                const arrayBuffer = await new Response(file.data).arrayBuffer();
                fileHash = sha256(Buffer.from(arrayBuffer));
              } catch (error) {
                console.warn(
                  'Failed to calculate file hash, proceeding without hash:',
                  error
                );
                fileHash = '';
              }
            }

            return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
              file,
              fileHash,
              contentType,
            });
          },
          listParts: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'list-parts', {
              file,
              ...props,
            }),
          signPart: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'sign-part', {
              file,
              ...props,
            }),
          abortMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'abort-multipart-upload', {
              file,
              ...props,
            }),
          completeMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', {
              file,
              ...props,
            }),
        },
      };
    case 'local':
      return {
        plugin: XHRUpload,
        options: {
          endpoint: `${backendUrl}/media/upload-server`,
          withCredentials: true,
        },
      };

    // Add more cases for other cloud providers
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
};
