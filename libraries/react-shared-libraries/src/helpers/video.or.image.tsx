import { FC } from 'react';

export const VideoOrImage: FC<{ src: string; autoplay: boolean }> = (props) => {
  const { src, autoplay } = props;
  if (src.indexOf('mp4') > -1) {
    return <video src={src} autoPlay={autoplay} className="w-full h-full" muted={true} loop={true} />;
  }

  return (
    <img
      className="w-full h-full object-cover"
      src={src}
    />
  );
};
