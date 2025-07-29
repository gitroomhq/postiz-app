'use client';

import { FC, useCallback } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Subreddit } from '@gitroom/frontend/components/new-launch/providers/reddit/subreddit';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useFieldArray, useWatch } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import {
  RedditSettingsDto,
  RedditSettingsValueDto,
} from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import clsx from 'clsx';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import Image from 'next/image';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFormatting } from '@gitroom/frontend/components/launches/helpers/use.formatting';
const RenderRedditComponent: FC<{
  type: string;
  images?: Array<{
    id: string;
    path: string;
  }>;
}> = (props) => {
  const { value: topValue } = useIntegration();
  const showMedia = useMediaDirectory();
  const t = useT();

  const { type, images } = props;
  const [firstPost] = topValue;
  switch (type) {
    case 'self':
      return (
        <div
          dangerouslySetInnerHTML={{ __html: firstPost?.content }}
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '14px',
          }}
        />
      );
    case 'link':
      return (
        <div className="h-[375px] bg-primary rounded-[16px] flex justify-center items-center">
          {t('link', 'Link')}
        </div>
      );
    case 'media':
      return (
        <div className="h-[375px] bg-primary rounded-[16px] flex justify-center items-center">
          {!!images?.length &&
            images.map((image, index) => (
              <a
                key={`image_${index}`}
                href={showMedia.set(image.path)}
                className="flex-1 h-full"
                target="_blank"
              >
                <img
                  className="w-full h-full object-cover"
                  src={showMedia.set(image.path)}
                />
              </a>
            ))}
        </div>
      );
  }
  return <></>;
};
const RedditPreview: FC = (props) => {
  const { value: topValue, integration } = useIntegration();
  const settings = useWatch({
    name: 'subreddit',
  }) as Array<RedditSettingsValueDto>;
  const [, ...restOfPosts] = useFormatting(topValue, {
    removeMarkdown: true,
    saveBreaklines: true,
    specialFunc: (text: string) => {
      return text.slice(0, 280);
    },
  });
  if (!settings || !settings.length) {
    return <>Please add at least one Subreddit from the settings</>;
  }
  return (
    <div className="flex flex-col gap-[40px] w-full">
      {settings
        .filter(({ value }) => value?.subreddit)
        .map(({ value }, index) => (
          <div
            key={index}
            className={clsx(
              `bg-customColor37 w-full p-[10px] flex flex-col border-tableBorder border`
            )}
          >
            <div className="flex flex-col">
              <div className="flex flex-row gap-[8px]">
                <div className="w-[40px] h-[40px] bg-white rounded-full" />
                <div className="flex flex-col">
                  <div className="text-[12px] font-[700]">
                    {value.subreddit}
                  </div>
                  <div className="text-[12px]">{integration?.name}</div>
                </div>
              </div>
              <div className="font-[600] text-[24px] mb-[16px]">
                {value.title}
              </div>
              <RenderRedditComponent type={value.type} images={value.media} />
              <div
                className={clsx(
                  restOfPosts.length && 'mt-[40px] flex flex-col gap-[20px]'
                )}
              >
                {restOfPosts.map((p, index) => (
                  <div className="flex gap-[8px]" key={index}>
                    <div className="w-[32px] h-[32px] relative">
                      <Image
                        width={48}
                        height={48}
                        src={integration?.picture!}
                        alt="x"
                        className="rounded-full w-full h-full relative z-[2]"
                      />
                      <Image
                        width={24}
                        height={24}
                        src={`/icons/platforms/${integration?.identifier!}.png`}
                        alt="x"
                        className="rounded-full absolute -end-[5px] -bottom-[5px] z-[2]"
                      />
                    </div>
                    <div className="flex-1 flex flex-col leading-[16px] w-full pe-[64px] pb-[8px] rounded-[8px]">
                      <div className="text-[14px] font-[600]">
                        {integration?.name}
                      </div>
                      <div
                        dangerouslySetInnerHTML={{ __html: p.text }}
                        style={{
                          whiteSpace: 'pre-wrap',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};
const RedditSettings: FC = () => {
  const { register, control } = useSettings();
  const { fields, append, remove } = useFieldArray({
    control,
    // control props comes from useForm (optional: if you are using FormContext)
    name: 'subreddit', // unique name for your Field Array
  });
  const t = useT();

  const addField = useCallback(() => {
    append({});
  }, [fields, append]);
  const deleteField = useCallback(
    (index: number) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_this_subreddit',
            'Are you sure you want to delete this Subreddit?'
          )
        ))
      )
        return;
      remove(index);
    },
    [fields, remove]
  );
  return (
    <>
      <div className="flex flex-col gap-[20px] mb-[20px]">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col relative">
            <div
              onClick={deleteField(index)}
              className="absolute -start-[10px] justify-center items-center flex -top-[10px] w-[20px] h-[20px] bg-red-600 rounded-full text-textColor"
            >
              x
            </div>
            <Subreddit {...register(`subreddit.${index}.value`)} />
          </div>
        ))}
      </div>
      <Button onClick={addField}>{t('add_subreddit', 'Add Subreddit')}</Button>
      {fields.length === 0 && (
        <div className="text-red-500 text-[12px] mt-[10px]">
          {t(
            'please_add_at_least_one_subreddit',
            'Please add at least one Subreddit'
          )}
        </div>
      )}
    </>
  );
};
export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: RedditSettings,
  CustomPreviewComponent: RedditPreview,
  dto: RedditSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 10000,
});
