import XHRUpload from '@uppy/xhr-upload';
import AwsS3Multipart from '@uppy/aws-s3';
import sha256 from 'sha256';

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
export const getUppyUploadPlugin = (provider: string, fetch: any, backendUrl: string, s3Config?: { bucket: string; region: string; uploadUrl: string }) => {
  switch (provider) {
    case 'cloudflare':
      return {
        plugin: AwsS3Multipart,
        options: {
          shouldUseMultipart: (file: any) => true,
          endpoint: '',
          createMultipartUpload: async (file: any) => {
            const arrayBuffer = await new Response(file.data).arrayBuffer();
            const fileHash = sha256(Buffer.from(arrayBuffer));
            const contentType = file.type;
            return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
              file,
              fileHash,
              contentType,
            });
          },
          listParts: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'list-parts', { file, ...props }),
          signPart: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'sign-part', { file, ...props }),
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

    case 'awss3':
      return {
        plugin: AwsS3Multipart,
        options: {
          shouldUseMultipart: (file: any) => true,
          endpoint: '', // Backend API to handle multipart uploads
          createMultipartUpload: async (file: any) => {
            const arrayBuffer = await new Response(file.data).arrayBuffer();
            const fileHash = sha256(Buffer.from(arrayBuffer));
            const contentType = file.type;

            return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
              bucket: s3Config?.bucket,
              region: s3Config?.region,
              file,
              fileHash,
              contentType,
            });
          },
          listParts: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'list-parts', { file, ...props }),

          signPart: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'sign-part', { file, ...props }),

          completeMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', {
              file,
              ...props,
            }),

          abortMultipartUpload: (file: any, props: any) =>
            fetchUploadApiEndpoint(fetch, 'abort-multipart-upload', {
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
}