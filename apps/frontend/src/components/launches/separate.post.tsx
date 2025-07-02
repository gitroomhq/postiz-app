import { Button } from '@gitroom/react/form/button';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { FC, useCallback } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
export const SeparatePost: FC<{
  posts: string[];
  len: number;
  merge: (posts: string[]) => void;
  changeLoading: (loading: boolean) => void;
}> = (props) => {
  const { len, posts } = props;
  const t = useT();
  const fetch = useFetch();

  const notReversible = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to separate all posts? This action is not reversible.',
        'Yes'
      )
    ) {
      props.changeLoading(true);
      const merge = props.posts.join('\n');
      const { posts } = await (
        await fetch('/posts/separate-posts', {
          method: 'POST',
          body: JSON.stringify({
            content: merge,
            len: props.len,
          }),
        })
      ).json();

      props.merge(posts);
      props.changeLoading(false);
    }
  }, [len, posts]);

  return (
    <Button className="!h-[30px] !text-sm !bg-red-800" onClick={notReversible}>
      {t('separate_post', 'Separate post to multiple posts')}
    </Button>
  );
};
