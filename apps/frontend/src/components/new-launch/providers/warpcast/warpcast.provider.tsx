'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC, useCallback } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useFieldArray } from 'react-hook-form';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Button } from '@gitroom/react/form/button';
import { Subreddit } from './subreddit';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const WrapcastProvider: FC = () => {
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
      <Button onClick={addField}>{t('add_channel', 'Add Channel')}</Button>
    </>
  );
};
export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: WrapcastProvider,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: async (list) => {
    if (
      list.some((item) => item.some((field) => field.path.indexOf('mp4') > -1))
    ) {
      return 'Can only accept images';
    }
    return true;
  },
  maximumCharacters: 800,
});
