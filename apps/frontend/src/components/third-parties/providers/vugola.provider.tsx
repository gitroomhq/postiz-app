import { thirdPartyWrapper } from '@gitroom/frontend/components/third-parties/third-party.wrapper';
import { useThirdPartySubmit } from '@gitroom/frontend/components/third-parties/third-party.function';
import { useThirdParty } from '@gitroom/frontend/components/third-parties/third-party.media';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Button } from '@gitroom/react/form/button';
import { useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const aspectRatio = [
  { key: '9:16', value: 'Portrait (9:16)' },
  { key: '16:9', value: 'Landscape (16:9)' },
  { key: '1:1', value: 'Square (1:1)' },
];

const captionStyles = [
  { key: 'none', value: 'None' },
  { key: 'minimalist', value: 'Minimalist' },
  { key: 'highlighted', value: 'Highlighted' },
  { key: 'scale', value: 'Scale' },
  { key: 'box', value: 'Box' },
];

type VugolaFormValues = {
  video_url: string;
  aspect_ratio: string;
  caption_style: string;
};

const VugolaProviderComponent = () => {
  const thirdParty = useThirdParty();
  const send = useThirdPartySubmit();

  const form = useForm<VugolaFormValues>({
    values: {
      video_url: '',
      aspect_ratio: '',
      caption_style: '',
    },
    mode: 'all',
    resolver: zodResolver(
      object({
        video_url: string()
          .url('Must be a valid URL')
          .min(1, 'Video URL is required'),
        aspect_ratio: string().min(1, 'Aspect ratio is required'),
        caption_style: string().min(1, 'Caption style is required'),
      })
    ),
  });

  const submit: SubmitHandler<VugolaFormValues> = useCallback(
    async (params) => {
      thirdParty.onChange(await send(params));
      thirdParty.close();
    },
    [thirdParty, send]
  );

  return (
    <div>
      {form.formState.isSubmitting && (
        <div className="fixed left-0 top-0 w-full leading-[50px] pt-[200px] h-screen bg-black/90 z-50 flex flex-col justify-center items-center text-center text-3xl">
          Clipping your video... This can take 10-30 minutes.
          <br />
          Vugola will also email you when it&apos;s done.
          <br />
          DO NOT CLOSE THIS WINDOW!
          <br />
          <LoadingComponent width={200} height={200} />
        </div>
      )}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="w-full flex flex-col"
        >
          <Input
            label="Video URL"
            {...form.register('video_url')}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          <Select label="Aspect Ratio" {...form.register('aspect_ratio')}>
            <option value="">--SELECT--</option>
            {aspectRatio.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <Select label="Caption Style" {...form.register('caption_style')}>
            <option value="">--SELECT--</option>
            {captionStyles.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <Button type="submit">Generate Clips</Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default thirdPartyWrapper('vugola', VugolaProviderComponent);
