import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { FC, useCallback } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const MergePost: FC<{
  merge: () => void;
}> = (props) => {
  const { merge } = props;
  const t = useT();

  const notReversible = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to merge all comments into one post? This action is not reversible.',
        'Yes'
      )
    ) {
      merge();
    }
  }, [merge]);
  return (
    <Button className="!h-[30px] !text-sm !bg-red-800" onClick={notReversible}>
      {t('merge_comments_into_one_post', 'Merge comments into one post')}
    </Button>
  );
};
