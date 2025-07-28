import React, { useCallback, useEffect, useMemo, useState } from 'react';
// @ts-ignore
import Uppy, { UploadResult } from '@uppy/core';
// @ts-ignore
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { getUppyUploadPlugin } from '@gitroom/react/helpers/uppy.upload';
import { Dashboard, FileInput, ProgressBar } from '@uppy/react';

// Uppy styles
import { useVariables } from '@gitroom/react/helpers/variable.context';
import Compressor from '@uppy/compressor';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { uniq } from 'lodash';

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
  const setLocked = useLaunchStore((state) => state.setLocked);
  const toast = useToaster();
  const { storageProvider, backendUrl, disableImageCompression, transloadit } =
    useVariables();
  const { onUploadSuccess, allowedFileTypes } = props;
  const fetch = useFetch();
  return useMemo(() => {
    const uppy2 = new Uppy({
      autoProceed: true,
      restrictions: {
        // maxNumberOfFiles: 5,
        allowedFileTypes: allowedFileTypes.split(','),
        maxFileSize: 1000000000, // Default 1GB, but we'll override with custom validation
      },
    });

    // check for valid file types it can be something like this image/*,video/mp4.
    // If it's an image, I need to replace image/* with image/png, image/jpeg, image/jpeg, image/gif (separately)
    uppy2.addPreProcessor((fileIDs) => {
      return new Promise<void>((resolve, reject) => {
        const files = uppy2.getFiles();
        const allowedTypes = allowedFileTypes
          .split(',')
          .map((type) => type.trim());

        // Expand generic types to specific ones
        const expandedTypes = allowedTypes.flatMap((type) => {
          if (type === 'image/*') {
            return [
              'image/png',
              'image/jpeg',
              'image/jpg',
              'image/gif',
              'image/webp',
              'image/svg+xml',
            ];
          }
          if (type === 'video/*') {
            return [
              'video/mp4',
              'video/mpeg',
              'video/quicktime',
              'video/x-msvideo',
              'video/webm',
            ];
          }
          if (type === 'audio/*') {
            return ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
          }
          return [type];
        });

        for (const file of files) {
          if (fileIDs.includes(file.id)) {
            const fileType = file.type;

            // Check if file type is allowed
            const isAllowed = expandedTypes.some((allowedType) => {
              if (allowedType.endsWith('/*')) {
                const baseType = allowedType.replace('/*', '/');
                return fileType?.startsWith(baseType);
              }
              return fileType === allowedType;
            });

            if (!isAllowed) {
              const error = new Error(
                `File type "${fileType}" is not allowed for file "${file.name}". Allowed types: ${allowedFileTypes}`
              );
              uppy2.log(error.message, 'error');
              uppy2.info(error.message, 'error', 5000);
              toast.show(
                `File type "${fileType}" is not allowed. Allowed types: ${allowedFileTypes}`
              );
              uppy2.removeFile(file.id);
              return reject(error);
            }
          }
        }

        resolve();
      });
    });

    uppy2.addPreProcessor((fileIDs) => {
      return new Promise<void>((resolve, reject) => {
        const files = uppy2.getFiles();

        for (const file of files) {
          if (fileIDs.includes(file.id)) {
            const isImage = file.type?.startsWith('image/');
            const isVideo = file.type?.startsWith('video/');

            const maxImageSize = 30 * 1024 * 1024; // 30MB
            const maxVideoSize = 1000 * 1024 * 1024; // 1GB

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
      transloadit.length > 0 ? 'transloadit' : storageProvider,
      fetch,
      backendUrl,
      transloadit
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
      setLocked(true);
      uppy2.setFileMeta(file.id, {
        useCloudflare: storageProvider === 'cloudflare' ? 'true' : 'false', // Example of adding a custom field
        // Add more fields as needed
      });
    });
    uppy2.on('error', (result) => {
      setLocked(false);
    });
    uppy2.on('complete', async (result) => {
      if (storageProvider === 'local') {
        setLocked(false);
        onUploadSuccess(result.successful.map((p) => p.response.body));
        return;
      }

      console.log(result);
      if (transloadit.length > 0) {
        // @ts-ignore
        const allRes = result.transloadit[0].results;
        const toSave = uniq<string>(
          allRes[Object.keys(allRes)[0]].flatMap((item: any) =>
            item.url.split('/').pop()
          )
        );

        const loadAllMedia = await Promise.all(
          toSave.map(async (name) => {
            return (
              await fetch('/media/save-media', {
                method: 'POST',
                body: JSON.stringify({
                  name,
                }),
              })
            ).json();
          })
        );

        setLocked(false);
        onUploadSuccess(loadAllMedia);
        return;
      }

      setLocked(false);
      onUploadSuccess(result.successful.map((p) => p.response.body.saved));
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
      <div className="pointer-events-none bigWrap">
        <Dashboard
          height={23}
          width={200}
          className=""
          uppy={uppyInstance}
          id={`media-uploader`}
          showProgressDetails={true}
          hideUploadButton={true}
          hideRetryButton={true}
          hidePauseResumeButton={true}
          hideCancelButton={true}
          hideProgressAfterFinish={true}
        />
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
