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

export function MultipartFileUploader({
  onUploadSuccess,
  allowedFileTypes,
}: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
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
  const { storageProvider, backendUrl } = useVariables();
  const { onUploadSuccess, allowedFileTypes } = props;
  const fetch = useFetch();

  return useMemo(() => {
    const uppy2 = new Uppy({
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: allowedFileTypes.split(','),
        maxFileSize: 1000000000,
      },
    });

    const { plugin, options } = getUppyUploadPlugin(
      storageProvider,
      fetch,
      backendUrl
    );
    uppy2.use(plugin, options);
    uppy2.use(Compressor, {
      convertTypes: ['image/jpeg'],
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 1,
    });
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
}: {
  // @ts-ignore
  onUploadSuccess: (result: UploadResult) => void;
  allowedFileTypes: string;
}) {
  const uppy = useUppyUploader({ onUploadSuccess, allowedFileTypes });

  return (
    <>
      {/* <Dashboard uppy={uppy} /> */}
      <ProgressBar uppy={uppy} />
      <FileInput
        uppy={uppy}
        locale={{
          strings: {
            chooseFiles: 'Upload',
          },
          pluralize: (n) => n,
        }}
      />
    </>
  );
}
