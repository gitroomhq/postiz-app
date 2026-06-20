import { thirdPartyWrapper } from '@gitroom/frontend/components/third-parties/third-party.wrapper';
import {
  useThirdPartyFunction,
  useThirdPartyFunctionSWR,
  useThirdPartySubmit,
} from '@gitroom/frontend/components/third-parties/third-party.function';
import { useThirdParty } from '@gitroom/frontend/components/third-parties/third-party.media';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { Textarea } from '@gitroom/react/form/textarea';
import { Button } from '@gitroom/react/form/button';
import { FC, useCallback, useState } from 'react';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { object, string } from 'zod';
import { Select } from '@gitroom/react/form/select';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const aspectRatio = [
  { key: 'portrait', value: 'Portrait' },
  { key: 'story', value: 'Story' },
];

const generateCaptions = [
  { key: 'yes', value: 'Yes' },
  { key: 'no', value: 'No' },
];

const SelectAvatarComponent: FC<{
  avatarList: any[];
  onChange: (id: string) => void;
}> = (props) => {
  const [current, setCurrent] = useState<any>({});
  const { avatarList, onChange } = props;

  return (
    <div className="grid grid-cols-4 gap-[10px] justify-items-center justify-center">
      {avatarList?.map((p) => (
        <div
          onClick={() => {
            setCurrent(p.avatar_id === current?.avatar_id ? undefined : p);
            onChange(p.avatar_id === current?.avatar_id ? {} : p.avatar_id);
          }}
          key={p.avatar_id}
          className={clsx(
            'w-full h-full p-[20px] min-h-[100px] text-[14px] hover:bg-input transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer',
            current?.avatar_id === p.avatar_id
              ? 'bg-input border border-red-500'
              : 'bg-third'
          )}
        >
          <div>
            <img
              src={p.preview_image_url}
              className="w-full h-full object-cover"
            />
          </div>
          <div>{p.avatar_name}</div>
        </div>
      ))}
    </div>
  );
};

const SelectVoiceComponent: FC<{
  voiceList: any[];
  onChange: (id: string) => void;
}> = (props) => {
  const [current, setCurrent] = useState<any>({});
  const { voiceList, onChange } = props;

  return (
    <div className="grid grid-cols-6 gap-[10px] justify-items-center justify-center">
      {voiceList?.map((p) => (
        <div
          onClick={() => {
            setCurrent(p.voice_id === current?.voice_id ? undefined : p);
            onChange(p.voice_id === current?.voice_id ? {} : p.voice_id);
          }}
          key={p.avatar_id}
          className={clsx(
            'w-full h-full p-[20px] min-h-[100px] text-[14px] hover:bg-input transition-all text-textColor relative flex flex-col gap-[15px] cursor-pointer',
            current?.voice_id === p.voice_id
              ? 'bg-input border border-red-500'
              : 'bg-third'
          )}
        >
          <div className="text-[14px] text-balance whitespace-pre-line">
            {p.name}
          </div>
          <div className="text-[12px]">{p.language}</div>
        </div>
      ))}
    </div>
  );
};

const HeygenProviderComponent = () => {
  const thirdParty = useThirdParty();
  const load = useThirdPartyFunction('EVERYTIME');
  const { data } = useThirdPartyFunctionSWR('LOAD_ONCE', 'avatars');
  const { data: voices } = useThirdPartyFunctionSWR('LOAD_ONCE', 'voices');
  const send = useThirdPartySubmit();
  const [hideVoiceGenerator, setHideVoiceGenerator] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);

  const form = useForm({
    values: {
      voice: '',
      avatar: '',
      aspect_ratio: '',
      captions: '',
      selectedVoice: '',
      type: '',
    },
    mode: 'all',
    resolver: zodResolver(
      object({
        voice: string().min(20, 'Voice must be at least 20 characters long'),
        avatar: string().min(1, 'Avatar is required'),
        selectedVoice: string().min(1, 'Voice is required'),
        aspect_ratio: string().min(1, 'Aspect ratio is required'),
        captions: string().min(1, 'Captions is required'),
      })
    ),
  });

  const generateVoice = useCallback(async () => {
    if (
      !(await deleteDialog('Are you sure? it will delete the current text'))
    ) {
      return;
    }

    setVoiceLoading(true);

    form.setValue(
      'voice',
      (
        await load('generateVoice', {
          text: thirdParty.data.map((p) => p.content).join('\n'),
        })
      ).voice
    );

    setVoiceLoading(false);
    setHideVoiceGenerator(true);
  }, [thirdParty]);

  const submit: SubmitHandler<{ voice: string; avatar: string }> = useCallback(
    async (params) => {
      thirdParty.onChange(await send(params));
      thirdParty.close();
    },
    []
  );

  return (
    <div>
      {form.formState.isSubmitting && (
        <div className="fixed left-0 top-0 w-full leading-[50px] pt-[200px] h-screen bg-black/90 z-50 flex flex-col justify-center items-center text-center text-3xl">
          Grab a coffee and relax, this may take a while...
          <br />
          You can also track the progress directly in HeyGen Dashboard.
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
          <Select label="Aspect Ratio" {...form.register('aspect_ratio')}>
            <option value="">--SELECT--</option>
            {aspectRatio.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <Select label="Generate Captions" {...form.register('captions')}>
            <option value="">--SELECT--</option>
            {generateCaptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <div className="text-lg mb-3">Voice to generate</div>
          {!hideVoiceGenerator && (
            <Button onClick={generateVoice} loading={voiceLoading}>
              Generate Voice From My Post Text
            </Button>
          )}
          <Textarea label="" {...form.register('voice')} />
          {!!data?.length && (
            <>
              <div className="text-lg my-3">Select Avatar</div>
              <SelectAvatarComponent
                avatarList={data.map((p: any) => ({
                  avatar_id: p.avatar_id || p.id,
                  avatar_name: p.avatar_name || p.name,
                  preview_image_url: p.preview_image_url || p.image_url,
                }))}
                onChange={(id: string) => {
                  form.setValue('avatar', id);
                  form.setValue(
                    'type',
                    data?.find((p: any) => p.id === id || p.avatar_id === id)?.id
                      ? 'talking_photo'
                      : 'avatar'
                  );
                }}
              />
              <div className="text-red-400 text-[12px] mb-3">
                {form?.formState?.errors?.avatar?.message || ''}
              </div>
            </>
          )}

          {!!voices?.length && (
            <>
              <div className="text-lg my-3">Select Voice</div>
              <SelectVoiceComponent
                voiceList={voices}
                onChange={(id: string) => form.setValue('selectedVoice', id)}
              />
              <div className="text-red-400 text-[12px] mb-3">
                {form?.formState?.errors?.selectedVoice?.message || ''}
              </div>
            </>
          )}

          <Button type="submit">Generate Video</Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default thirdPartyWrapper('heygen', HeygenProviderComponent);
