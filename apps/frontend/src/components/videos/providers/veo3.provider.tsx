import { videoWrapper } from '@gitroom/frontend/components/videos/video.wrapper';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useVideo } from '@gitroom/frontend/components/videos/video.context.wrapper';
import { Textarea } from '@gitroom/react/form/textarea';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';

export interface Voice {
  id: string;
  name: string;
  preview_url: string;
}

const VEO3Settings: FC = () => {
  const { register, watch, setValue, formState } = useFormContext();
  const { value } = useVideo();

  const media = register('media', {
    value: [],
  });

  const mediaValue = watch('media');

  return (
    <div>
      <Textarea
        label="Prompt"
        name="prompt"
        {...register('prompt', {
          required: true,
          minLength: 5,
          value,
        })}
        error={formState?.errors?.prompt?.message}
      />
      <div className="mb-[6px]">Images (max 3)</div>
      <MultiMediaComponent
        allData={[]}
        dummy={true}
        text="Images"
        description="Images"
        name="images"
        label="Media"
        value={mediaValue}
        onChange={(val) =>
          setValue(
            'images',
            val.target.value
              .filter((f) => f.path.indexOf('mp4') === -1)
              .slice(0, 3)
          )
        }
        error={formState?.errors?.media?.message}
      />
    </div>
  );
};

const VeoComponent = () => {
  return <VEO3Settings />;
};

videoWrapper('veo3', VeoComponent);
