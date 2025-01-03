import { useDropzone } from 'react-dropzone';
import { FC, ReactNode } from 'react';

export const DropFiles: FC<{ children: ReactNode, onDrop: (files: File[]) => void }> = (props) => {
  const { getRootProps, isDragActive } = useDropzone({
    onDrop: props.onDrop
  });

  return (
    <div {...getRootProps()} className="relative">
      {isDragActive && (
        <div className="absolute left-0 top-0 w-full h-full bg-black/90 flex items-center justify-center z-[200] animate-normalFadeIn">
          Drag n drop some files here
        </div>
      )}
      {props.children}
    </div>
  );
};
