import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';

const FacebookSettings: FC = () => {
  const { register } = useSettings();
  return (
    <div className="mt-[20px]">
      <MediaComponent
        type="image"
        width={1280}
        height={720}
        label="Video Thumbnail"
        description="Thumbnail for video posts (optional)"
        {...register('thumbnail')}
      />
    </div>
  );
};

export default withProvider(
  FacebookSettings,
  undefined,
  undefined,
  undefined,
  63206
);
