import { useDropzone } from 'react-dropzone';
import { FC, ReactNode } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const DropFiles: FC<{
  children: ReactNode;
  onDrop: (files: File[]) => void;
}> = (props) => {
  const t = useT();

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: props.onDrop,
  });
  return (
    <div {...getRootProps()} className="relative">
      {isDragActive && (
        <div className="absolute start-0 top-0 w-full h-full bg-black/90 flex items-center justify-center z-[200] animate-normalFadeIn">
          {t('drag_n_drop_some_files_here', 'Drag n drop some files here')}
        </div>
      )}
      {props.children}
    </div>
  );
};
