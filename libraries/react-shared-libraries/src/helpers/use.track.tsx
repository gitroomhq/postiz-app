import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback } from 'react';

export const useTrack = () => {
  const user = useUser();
  const fetch = useFetch();

  return useCallback(
    async (track: TrackEnum, additional?: Record<string, any>) => {
      if (!process.env.NEXT_PUBLIC_FACEBOOK_PIXEL) {
        return;
      }

      try {
        if (window.fbq) {
          // @ts-ignore
          window.fbq('track', TrackEnum[track], additional);
        }

        await fetch(user ? `/user/t` : `/public/t`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tt: track,
            ...(additional ? { additional } : {}),
          }),
        });
      } catch (e) {
        console.log(e);
      }
    },
    [user]
  );
};
