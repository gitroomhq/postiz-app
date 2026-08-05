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
  /** Media-page style overlay matching the design drag hint. */
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
          'Upload current in progress, please wait and then try again.',
          'warning'
        );
        return;
      }
      props.onDrop(files);
    },
  });
  return (
    <div {...getRootProps()} className={clsx('relative', props.className)}>
      {isDragActive &&
        (props.brandOverlay ? (
          <div className="pointer-events-none absolute inset-[12px] z-[20] flex flex-col items-center justify-center gap-[10px] rounded-pqLg bg-pqBrandFaint shadow-[inset_0_0_0_2px_var(--brand)] backdrop-blur-[2px]">
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
        ) : (
          <div className="absolute start-0 top-0 z-[200] flex h-full w-full animate-normalFadeIn items-center justify-center bg-black/90">
            {t('drag_n_drop_some_files_here', 'Drag n drop some files here')}
          </div>
        ))}
      {props.children}
    </div>
  );
};
