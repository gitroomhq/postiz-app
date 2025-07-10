import { createContext, FC, useCallback, useContext } from 'react';
import './providers/image-text-slides.provider';
import { videosList } from '@gitroom/frontend/components/videos/video.wrapper';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

const VideoFunctionWrapper = createContext({
  identifier: '',
});

export const useVideoFunction = () => {
  const { identifier } = useContext(VideoFunctionWrapper);
  const fetch = useFetch();

  return useCallback(
    async (funcName: string, params: any) => {
      return (
        await fetch(`/media/video/${identifier}/${funcName}`, {
          method: 'POST',
          body: JSON.stringify({ params }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ).json();
    },
    [identifier]
  );
};

export const VideoWrapper: FC<{ identifier: string }> = (props) => {
  const { identifier } = props;
  const Component = videosList.find(
    (v) => v.identifier === identifier
  )?.Component;
  if (!Component) {
    return null;
  }
  return (
    <VideoFunctionWrapper.Provider value={{ identifier }}>
      <Component />
    </VideoFunctionWrapper.Provider>
  );
};
