import { useDropzone } from 'react-dropzone';
import { FC, ReactNode } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const DropFiles: FC<{
  children: ReactNode;
  className?: string;
  onDrop: (files: File[]) => void;
  disabled?: boolean;
  /** When true, clicks do not open the OS file picker (use an explicit browse control). */
  noClick?: boolean;
  /**
   * Media-page style overlay: inset-[12px] + solid cover. Default is inset-0.
   * Always opaque (`bg-pqInner`) so thumbs never show through.
   */
  brandOverlay?: boolean;
}> = (props) => {
  const t = useT();
  const toaster = useToaster();

  const { getRootProps, isDragActive } = useDropzone({
    noClick: props.noClick ?? false,
    noKeyboard: props.noClick ?? false,
    onDrop: (files) => {
      if (props.disabled) {
        toaster.show(
          t(
            'upload_in_progress_wait',
            'Upload in progress — please wait, then try again.'
          ),
          'warning'
        );
        return;
      }
      props.onDrop(files);
    },
  });
  return (
    <div {...getRootProps()} className={clsx('relative', props.className)}>
      {isDragActive && (
        <div
          className={clsx(
            // Solid cover — hide content under the brand ring (never /95 frost).
            'pointer-events-none absolute z-[20] flex flex-col items-center justify-center gap-[10px] rounded-pqLg bg-pqInner shadow-[inset_0_0_0_2px_var(--brand)]',
            props.brandOverlay ? 'inset-[12px]' : 'inset-0'
          )}
        >
          <span className="grid h-[48px] w-[48px] place-items-center rounded-[14px] bg-pqBrand text-pqOnBrand">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path
                d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="text-[15px] font-[600] text-pqText">
            {t('drop_files_to_upload', 'Drop files to upload')}
          </div>
          <div className="text-[12.5px] text-pqMuted">
            {t(
              'images_and_video_up_to_1gb',
              'Images and video, up to 1 GB per upload'
            )}
          </div>
        </div>
      )}
      {props.children}
    </div>
  );
};
