import { FC, useEffect } from 'react';
import { clsx } from 'clsx';
import { createPDFThumbnails } from '@gitroom/helpers/utils/pdf-thumbnails';

export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
}> = (props) => {
  const { src, autoplay, isContain } = props;

  useEffect(() => {
    if (src?.indexOf('pdf') > -1) {
      createPDFThumbnails();
    }
  }, [src]);

  if (src?.indexOf('mp4') > -1) {
    return (
      <video
        src={src}
        autoPlay={autoplay}
        className="w-full h-full"
        muted={true}
        loop={true}
      />
    );
  }

  if (src?.indexOf('pdf') > -1) {
    return (
      <img
        className={clsx(
          isContain ? 'object-contain' : 'object-cover',
          'w-full h-full'
        )}
        data-pdf-thumbnail-file={src}
        src="/icons/pdf.svg"
      />
    );
  }

  return (
    <img
      className={clsx(
        isContain ? 'object-contain' : 'object-cover',
        'w-full h-full'
      )}
      src={src}
    />
  );
};
