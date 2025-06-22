import React, { useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore
import Uppy, { UploadResult } from '@uppy/core';
// @ts-ignore
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { getUppyUploadPlugin } from '@gitroom/react/helpers/uppy.upload';
import { FileInput, ProgressBar } from '@uppy/react';

// Uppy styles
import '@uppy/core/dist/style.min.css';
import '@uppy/dashboard/dist/style.min.css';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import Compressor from '@uppy/compressor';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';

export function MultipartFileUploader({
  onUploadSuccess,
  allowedFileTypes,
  uppRef,
}: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
  uppRef?: any;
}) {
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(false);
  const onUploadSuccessExtended = useCallback(
    (result: UploadResult<any, any>) => {
      setReload(true);
      onUploadSuccess(result);
    },
    [onUploadSuccess]
  );
  useEffect(() => {
    if (reload) {
      setTimeout(() => {
        setReload(false);
      }, 1);
    }
  }, [reload]);
  useEffect(() => {
    setLoaded(true);
  }, []);
  if (!loaded || reload) {
    return null;
  }
  return (
    <MultipartFileUploaderAfter
      uppRef={uppRef || {}}
      onUploadSuccess={onUploadSuccessExtended}
      allowedFileTypes={allowedFileTypes}
    />
  );
}
export function useUppyUploader(props: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
}) {
  const toast = useToaster();
  const { storageProvider, backendUrl, disableImageCompression } =
    useVariables();
  const { onUploadSuccess, allowedFileTypes } = props;
  const fetch = useFetch();
  return useMemo(() => {
    const uppy2 = new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 5,
        allowedFileTypes: allowedFileTypes.split(','),
        maxFileSize: 1000000000, // Default 1GB, but we'll override with custom validation
      },
    });

    // Custom file size validation based on file type
    uppy2.addPreProcessor((fileIDs) => {
      return new Promise<void>((resolve, reject) => {
        const files = uppy2.getFiles();

        for (const file of files) {
          if (fileIDs.includes(file.id)) {
            const isImage = file.type?.startsWith('image/');
            const isVideo = file.type?.startsWith('video/');

            const maxImageSize = 30 * 1024 * 1024; // 30MB
            const maxVideoSize = 30 * 1024 * 1024; // 1000 * 1024 * 1024; // 1GB

            if (isImage && file.size > maxImageSize) {
              const error = new Error(
                `Image file "${file.name}" is too large. Maximum size allowed is 30MB.`
              );
              uppy2.log(error.message, 'error');
              uppy2.info(error.message, 'error', 5000);
              toast.show(
                `Image file is too large. Maximum size allowed is 30MB.`
              );
              uppy2.removeFile(file.id); // Remove file from queue
              return reject(error);
            }

            if (isVideo && file.size > maxVideoSize) {
              const error = new Error(
                `Video file "${file.name}" is too large. Maximum size allowed is 1GB.`
              );
              uppy2.log(error.message, 'error');
              uppy2.info(error.message, 'error', 5000);
              toast.show(
                `Video file is too large. Maximum size allowed is 1GB.`
              );
              uppy2.removeFile(file.id); // Remove file from queue
              return reject(error);
            }
          }
        }

        resolve();
      });
    });

    const { plugin, options } = getUppyUploadPlugin(
      storageProvider,
      fetch,
      backendUrl
    );
    uppy2.use(plugin, options);
    if (!disableImageCompression) {
      uppy2.use(Compressor, {
        convertTypes: ['image/jpeg'],
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 1,
      });
    }
    // Set additional metadata when a file is added
    uppy2.on('file-added', (file) => {
      uppy2.setFileMeta(file.id, {
        useCloudflare: storageProvider === 'cloudflare' ? 'true' : 'false', // Example of adding a custom field
        // Add more fields as needed
      });
    });
    uppy2.on('complete', (result) => {
      onUploadSuccess(result);
    });
    uppy2.on('upload-success', (file, response) => {
      // @ts-ignore
      uppy2.setFileState(file.id, {
        // @ts-ignore
        progress: uppy2.getState().files[file.id].progress,
        // @ts-ignore
        uploadURL: response.body.Location,
        response: response,
        isPaused: false,
      });
    });
    return uppy2;
  }, []);
}
export function MultipartFileUploaderAfter({
  onUploadSuccess,
  allowedFileTypes,
  uppRef,
}: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
  uppRef: any;
}) {
  const t = useT();
  const uppy = useUppyUploader({
    onUploadSuccess,
    allowedFileTypes,
  });
  const uppyInstance = useMemo(() => {
    uppRef.current = uppy;
    return uppy;
  }, []);
  return (
    <>
      {/* <Dashboard uppy={uppy} /> */}
      <div className="pointer-events-none">
        <ProgressBar uppy={uppyInstance} />
      </div>
      <FileInput
        uppy={uppyInstance}
        locale={{
          strings: {
            chooseFiles: t('upload', 'Upload'),
          },
          // @ts-ignore
          pluralize: (n: any) => n,
        }}
      />
    </>
  );
}
