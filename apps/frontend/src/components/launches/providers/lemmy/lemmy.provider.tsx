import { FC, useCallback } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useFieldArray } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { Subreddit } from './subreddit';
import { LemmySettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/lemmy.dto';

const LemmySettings: FC = () => {
  const { register, control } = useSettings();
  const { fields, append, remove } = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormContext)
    name: 'subreddit', // unique name for your Field Array
  });

  const addField = useCallback(() => {
    append({});
  }, [fields, append]);

  const deleteField = useCallback(
    (index: number) => async () => {
      if (
        !(await deleteDialog('Are you sure you want to delete this Subreddit?'))
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
              className="absolute -left-[10px] justify-center items-center flex -top-[10px] w-[20px] h-[20px] bg-red-600 rounded-full text-textColor"
            >
              x
            </div>
            <Subreddit {...register(`subreddit.${index}.value`)} />
          </div>
        ))}
      </div>
      <Button onClick={addField}>Add Community</Button>
      {fields.length === 0 && (
        <div className="text-red-500 text-[12px] mt-[10px]">
          Please add at least one Subreddit
        </div>
      )}
    </>
  );
};

export default withProvider(
  LemmySettings,
  undefined,
  LemmySettingsDto,
  async (items) => {
    const [firstItems] = items;

    if (
      firstItems.length &&
      firstItems[0].path.indexOf('png') === -1 &&
      firstItems[0].path.indexOf('jpg') === -1 &&
      firstItems[0].path.indexOf('jpef') === -1 &&
      firstItems[0].path.indexOf('gif') === -1
    ) {
      return 'You can set only one picture for a cover';
    }

    return true;
  },
  10000
);
