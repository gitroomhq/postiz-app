import { FC } from 'react';
import { clsx } from 'clsx';
export const VideoOrImage: FC<{
  src: string;
  autoplay: boolean;
  isContain?: boolean;
}> = (props) => {
  const { src, autoplay, isContain } = props;
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
