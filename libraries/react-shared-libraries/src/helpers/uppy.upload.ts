import XHRUpload from '@uppy/xhr-upload';
import AwsS3Multipart from '@uppy/aws-s3';
import sha256 from 'sha256';
import Transloadit from '@uppy/transloadit';
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
/**
 * The `auth` token, when it is readable from JavaScript.
 *
 * Only NOT_SECURED (header auth) mode sets this cookie client-side; the default
 * cookie-auth mode sets it httpOnly, so this returns undefined there. That
 * difference is what lets the local uploader pick the right auth mechanism.
 */
const readAuthCookie = (): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(/(?:^|;\s*)auth=([^;]+)/)?.[1];
};

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
    case 'local': {
      // NOT_SECURED switches the app from cookie auth to header auth, and
      // main.ts drops `credentials: true` from the CORS config along with it.
      // Asking for cookie credentials there sends a cookie the server is not
      // using against a policy that forbids them, so the browser blocks the
      // response and Uppy reports a bare "network error".
      //
      // The two modes are distinguishable without extra configuration: in
      // cookie-auth mode the `auth` cookie is set httpOnly (see
      // users.controller.ts) and cannot be read here, while NOT_SECURED sets it
      // client-side and it can. A readable cookie therefore means header auth.
      const usesHeaderAuth = Boolean(readAuthCookie());
      return {
        plugin: XHRUpload,
        options: {
          endpoint: `${backendUrl}/media/upload-server`,
          withCredentials: !usesHeaderAuth,
          // Read per request rather than once, so a token refreshed mid-session
          // is picked up. Empty in cookie-auth mode, which leaves the request
          // exactly as it is today.
          headers: () => {
            const token = readAuthCookie();
            return token ? { auth: decodeURIComponent(token) } : {};
          },
        },
      };
    }

    // Add more cases for other cloud providers
    default:
      throw new Error(`Unsupported storage provider: ${provider}`);
  }
};
