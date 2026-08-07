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
import { useT } from '@gitroom/react/translation/get.transation.service.client';

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
    <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
      {avatarList?.map((p) => {
        const selected = p.avatar_id === current?.avatar_id;
        return (
          <button
            type="button"
            key={p.avatar_id}
            onClick={() => {
              setCurrent(selected ? undefined : p);
              onChange(selected ? ({} as any) : p.avatar_id);
            }}
            className={clsx(
              'flex flex-col gap-[10px] overflow-hidden rounded-pqMd p-[10px] text-start text-[13px] font-[500] text-pqText transition-shadow',
              selected
                ? 'bg-pqBrandSoft shadow-[inset_0_0_0_1.5px_var(--brand)]'
                : 'bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--brand)]'
            )}
          >
            <img
              src={p.preview_image_url}
              alt=""
              className="aspect-square w-full rounded-pqSm object-cover"
            />
            <div className="line-clamp-2 px-[2px]">{p.avatar_name}</div>
          </button>
        );
      })}
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
    <div className="grid gap-[10px] [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
      {voiceList?.map((p) => {
        const selected = p.voice_id === current?.voice_id;
        return (
          <button
            type="button"
            key={p.voice_id || p.avatar_id}
            onClick={() => {
              setCurrent(selected ? undefined : p);
              onChange(selected ? ({} as any) : p.voice_id);
            }}
            className={clsx(
              'flex min-h-[88px] flex-col gap-[6px] rounded-pqMd p-[12px] text-start transition-shadow',
              selected
                ? 'bg-pqBrandSoft shadow-[inset_0_0_0_1.5px_var(--brand)]'
                : 'bg-pqSettings shadow-[inset_0_0_0_1px_var(--border)] hover:shadow-[inset_0_0_0_1px_var(--brand)]'
            )}
          >
            <div className="text-[13px] font-[600] leading-[1.35] text-pqText text-balance">
              {p.name}
            </div>
            <div className="text-[11.5px] text-pqMuted">{p.language}</div>
          </button>
        );
      })}
    </div>
  );
};

const HeygenProviderComponent = () => {
  const t = useT();
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
      !(await deleteDialog(
        t(
          'heygen_replace_voice_confirm',
          'Are you sure? It will replace the current script text.'
        )
      ))
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
  }, [thirdParty, form, load, t]);

  const submit: SubmitHandler<{ voice: string; avatar: string }> = useCallback(
    async (params) => {
      thirdParty.onChange(await send(params));
      thirdParty.close();
    },
    [send, thirdParty]
  );

  return (
    <div className="flex flex-col gap-[4px]">
      {form.formState.isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[16px] bg-pqBg/95 px-[24px] text-center">
          <LoadingComponent width={120} height={120} />
          <div className="max-w-[420px] text-[16px] font-[600] leading-[1.45] text-pqText">
            {t(
              'heygen_generating_title',
              'Grab a coffee — this may take a while.'
            )}
          </div>
          <div className="max-w-[420px] text-[13.5px] leading-[1.5] text-pqMuted">
            {t(
              'heygen_generating_body',
              'You can also track progress in the HeyGen dashboard. Do not close this window.'
            )}
          </div>
        </div>
      )}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex w-full flex-col gap-[4px]"
        >
          <Select
            label={t('heygen_aspect_ratio', 'Aspect ratio')}
            {...form.register('aspect_ratio')}
          >
            <option value="">
              {t('heygen_select_placeholder', 'Select…')}
            </option>
            {aspectRatio.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <Select
            label={t('heygen_generate_captions', 'Generate captions')}
            {...form.register('captions')}
          >
            <option value="">
              {t('heygen_select_placeholder', 'Select…')}
            </option>
            {generateCaptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.value}
              </option>
            ))}
          </Select>

          <div className="mt-[8px] flex flex-col gap-[8px]">
            <div>
              <div className="text-[13px] font-[600] text-pqText">
                {t('heygen_voice_script', 'Voice script')}
              </div>
              <div className="mt-[2px] text-[12px] leading-[1.45] text-pqMuted">
                {t(
                  'heygen_voice_script_help',
                  'This text is spoken by the avatar in the video.'
                )}
              </div>
            </div>
            <Textarea label="" {...form.register('voice')} />
            {!hideVoiceGenerator && (
              <button
                type="button"
                onClick={generateVoice}
                disabled={voiceLoading}
                className="flex h-[36px] w-fit items-center justify-center rounded-pqSm bg-pqBtnSimple px-[14px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {voiceLoading
                  ? t('heygen_filling', 'Filling…')
                  : t('heygen_fill_from_post', 'Fill from post text')}
              </button>
            )}
          </div>

          {!!data?.length && (
            <div className="mt-[12px] flex flex-col gap-[10px]">
              <div className="text-[13px] font-[600] text-pqText">
                {t('heygen_select_avatar', 'Select avatar')}
              </div>
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
              {!!form?.formState?.errors?.avatar?.message && (
                <div className="text-[12px] text-pqWarn">
                  {form.formState.errors.avatar.message}
                </div>
              )}
            </div>
          )}

          {!!voices?.length && (
            <div className="mt-[12px] flex flex-col gap-[10px]">
              <div className="text-[13px] font-[600] text-pqText">
                {t('heygen_select_voice', 'Select voice')}
              </div>
              <SelectVoiceComponent
                voiceList={voices}
                onChange={(id: string) => form.setValue('selectedVoice', id)}
              />
              {!!form?.formState?.errors?.selectedVoice?.message && (
                <div className="text-[12px] text-pqWarn">
                  {form.formState.errors.selectedVoice.message}
                </div>
              )}
            </div>
          )}

          <div className="mt-[16px]">
            <Button type="submit" className="w-full">
              {t('heygen_generate_video', 'Generate video')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default thirdPartyWrapper('heygen', HeygenProviderComponent);
