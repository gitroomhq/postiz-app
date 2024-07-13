import React from 'react';
import Uppy, { type UploadResult } from '@uppy/core';
import { ProgressBar, FileInput, StatusBar } from '@uppy/react';
import { sha256 } from 'crypto-hash';
// @ts-ignore
import AwsS3Multipart from '@uppy/aws-s3-multipart';

// Uppy styles
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

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

export function MultipartFileUploader({
  onUploadSuccess,
  allowedFileTypes,
}: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
}) {
  const fetch = useFetch();
  const uppy = React.useMemo(() => {
    const uppy = new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: allowedFileTypes.split(','),
        maxFileSize: 1000000,
      },
    }).use(AwsS3Multipart, {
      // @ts-ignore
      createMultipartUpload: async (file) => {
        const arrayBuffer = await new Response(file.data).arrayBuffer();
        const fileHash = await sha256(arrayBuffer);
        const contentType = file.type;
        return fetchUploadApiEndpoint(fetch, 'create-multipart-upload', {
          file,
          fileHash,
          contentType,
        });
      },
      // @ts-ignore
      listParts: (file, props) =>
        fetchUploadApiEndpoint(fetch, 'list-parts', { file, ...props }),
      // @ts-ignore
      signPart: (file, props) =>
        fetchUploadApiEndpoint(fetch, 'sign-part', { file, ...props }),
      // @ts-ignore
      abortMultipartUpload: (file, props) =>
        fetchUploadApiEndpoint(fetch, 'abort-multipart-upload', {
          file,
          ...props,
        }),
      // @ts-ignore
      completeMultipartUpload: (file, props) =>
        fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', {
          file,
          ...props,
        }),
    });
    return uppy;
  }, []);
  uppy.on('complete', (result) => {
    onUploadSuccess(result);
  });
  uppy.on('upload-success', (file, response) => {
    // @ts-ignore
    uppy.setFileState(file.id, {
      // @ts-ignore
      progress: uppy.getState().files[file.id].progress,
      // @ts-ignore
      uploadURL: response.body.Location,
      response: response,
      isPaused: false,
    });
  });

  return (
    <>
      <ProgressBar uppy={uppy} />
      <FileInput
        uppy={uppy}
        pretty={true}
        locale={{
          strings: {
            chooseFiles: 'Upload',
          },
        }}
      />
    </>
  );
}
