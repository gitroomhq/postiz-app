import { FC, useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useModals } from '@mantine/modals';
import { Textarea } from '@gitroom/react/form/textarea';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Input } from '@gitroom/react/form/input';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import interClass from '@gitroom/react/helpers/inter.font';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as PenSvg } from '@gitroom/frontend/assets/edit.svg';
import { ReactComponent as BinSvg } from '@gitroom/frontend/assets/bin.svg';

export const CommentBox: FC<{
  value?: string;
  type: 'textarea' | 'input';
  onChange: (comment: string) => void;
}> = (props) => {
  const { value, onChange, type } = props;
  const Component = type === 'textarea' ? Textarea : Input;
  const [newComment, setNewComment] = useState(value || '');

  const newCommentFunc = useCallback(
    (event: { target: { value: string } }) => {
      setNewComment(event.target.value);
    },
    [newComment]
  );

  const changeIt = useCallback(() => {
    onChange(newComment);
    setNewComment('');
  }, [newComment]);

  return (
    <div
      className={clsx(
        'flex',
        type === 'textarea' ? 'flex-col' : 'flex-row flex items-end gap-[10px]'
      )}
    >
      <div className={clsx(type === 'input' && 'flex-1')}>
        <Component
          label={type === 'textarea' ? 'Add comment' : ''}
          placeholder={type === 'input' ? 'Add comment' : ''}
          name="comment"
          disableForm={true}
          value={newComment}
          onChange={newCommentFunc}
        />
      </div>
      <Button
        disabled={newComment.length < 2}
        onClick={changeIt}
        className={clsx(type === 'input' && 'mb-[27px]')}
      >
        {value ? 'Update' : 'Add comment'}
      </Button>
    </div>
  );
};

interface Comments {
  id: string;
  content: string;
  user: { email: string; id: string };
  childrenComment: Comments[];
}

export const EditableCommentComponent: FC<{
  comment: Comments;
  onEdit: (content: string) => void;
  onDelete: () => void;
}> = (props) => {
  const { comment, onEdit, onDelete } = props;
  const [commentContent, setCommentContent] = useState(comment.content);
  const [editMode, setEditMode] = useState(false);
  const user = useUser();

  const updateComment = useCallback((commentValue: string) => {
    if (commentValue !== comment.content) {
      setCommentContent(commentValue);
      onEdit(commentValue);
    }
    setEditMode(false);
  }, []);

  const deleteCommentFunction = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to delete this comment?',
        'Yes, Delete'
      )
    ) {
      onDelete();
    }
  }, []);

  if (editMode) {
    return (
      <CommentBox
        type="input"
        value={commentContent}
        onChange={updateComment}
      />
    );
  }

  return (
    <div className="flex gap-[5px]">
      <pre className="text-wrap">{commentContent}</pre>
      {user?.id === comment.user.id && (
        <>
          <PenSvg onClick={() => setEditMode(!editMode)} />
          <BinSvg onClick={deleteCommentFunction} />
        </>
      )}
    </div>
  );
};

export const CommentComponent: FC<{ date: dayjs.Dayjs }> = (props) => {
  const { date } = props;
  const { closeAll } = useModals();
  const [commentsList, setCommentsList] = useState<Comments[]>([]);
  const user = useUser();
  const fetch = useFetch();

  const load = useCallback(async () => {
    const data = await (
      await fetch(`/comments/${date.utc().format('YYYY-MM-DDTHH:mm:00')}`)
    ).json();

    setCommentsList(data);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const editComment = useCallback(
    (comment: Comments) => async (content: string) => {
      fetch(`/comments/${comment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          content,
          date: date.utc().format('YYYY-MM-DDTHH:mm:00'),
        }),
      });
    },
    []
  );

  const addComment = useCallback(
    async (content: string) => {
      const { id } = await (
        await fetch('/comments', {
          method: 'POST',
          body: JSON.stringify({
            content,
            date: date.utc().format('YYYY-MM-DDTHH:mm:00'),
          }),
        })
      ).json();

      setCommentsList((list) => [
        {
          id,
          user: { email: user?.email!, id: user?.id! },
          content,
          childrenComment: [],
        },
        ...list,
      ]);
    },
    [commentsList, setCommentsList]
  );

  const deleteComment = useCallback(
    (comment: Comments) => async () => {
      await fetch(`/comments/${comment.id}`, {
        method: 'DELETE',
      });
      setCommentsList((list) => list.filter((item) => item.id !== comment.id));
    },
    [commentsList, setCommentsList]
  );

  const deleteChildrenComment = useCallback(
    (parent: Comments, children: Comments) => async () => {
      await fetch(`/comments/${children.id}`, {
        method: 'DELETE',
      });

      setCommentsList((list) =>
        list.map((item) => {
          if (item.id === parent.id) {
            return {
              ...item,
              childrenComment: item.childrenComment.filter(
                (child) => child.id !== children.id
              ),
            };
          }
          return item;
        })
      );
    },
    [commentsList, setCommentsList]
  );

  const addChildrenComment = useCallback(
    (comment: Comments) => async (content: string) => {
      const { id } = await (
        await fetch(`/comments/${comment.id}`, {
          method: 'POST',
          body: JSON.stringify({
            content,
            date: date.utc().format('YYYY-MM-DDTHH:mm:00'),
          }),
        })
      ).json();

      setCommentsList((list) =>
        list.map((item) => {
          if (item.id === comment.id) {
            return {
              ...item,
              childrenComment: [
                ...item.childrenComment,
                {
                  id,
                  user: { email: user?.email!, id: user?.id! },
                  content,
                  childrenComment: [],
                },
              ],
            };
          }
          return item;
        })
      );
    },
    [commentsList]
  );

  const extractNameFromEmailAndCapitalize = useCallback((email: string) => {
    return (
      email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
    );
  }, []);

  return (
    <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
      <TopTitle title={`Comments for ${date.format('DD/MM/YYYY HH:mm')}`} />
      <button
        onClick={closeAll}
        className="outline-none absolute right-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <CloseXSvg />
      </button>

      <div>
        {commentsList.map((comment, index) => (
          <>
            <div
              key={`comment_${index}_${comment.content}`}
              className={clsx(
                `flex relative flex-col`,
                comment?.childrenComment?.length && 'gap-[10px]'
              )}
            >
              <div className="flex gap-[8px]">
                <div className="w-[40px] flex flex-col items-center">
                  <div
                    className={`rounded-full relative z-[2] text-blue-500 font-bold ${interClass} flex justify-center items-center w-[40px] h-[40px] bg-white border-tableBorder border`}
                  >
                    {comment.user.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 w-[2px] h-[calc(100%-10px)] bg-customColor25 absolute top-[10px] z-[1]" />
                </div>
                <div className="flex-1 flex flex-col gap-[4px]">
                  <div className="flex">
                    <div className="h-[22px] text-[15px] font-[700]">
                      {extractNameFromEmailAndCapitalize(comment.user.email)}
                    </div>
                  </div>
                  <EditableCommentComponent
                    onDelete={deleteComment(comment)}
                    onEdit={editComment(comment)}
                    comment={comment}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-[10px]">
                {comment?.childrenComment?.map((childComment, index2) => (
                  <div
                    key={`comment2_${index2}_${childComment.content}`}
                    className={clsx(`flex gap-[8px] relative`)}
                  >
                    <div className="w-[40px] flex flex-col items-center">
                      <div
                        className={`rounded-full relative z-[2] text-blue-500 font-bold ${interClass} flex justify-center items-center w-[40px] h-[40px] bg-white border-tableBorder border`}
                      >
                        {childComment.user.email[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-[4px]">
                      <div className="flex">
                        <div className="h-[22px] text-[15px] font-[700]">
                          {extractNameFromEmailAndCapitalize(
                            childComment.user.email
                          )}
                        </div>
                      </div>
                      <EditableCommentComponent
                        onDelete={deleteChildrenComment(comment, childComment)}
                        onEdit={editComment(childComment)}
                        comment={childComment}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex">
              <div className="relative w-[40px] flex flex-col items-center">
                <div className="h-[30px] w-[2px] bg-customColor25 absolute top-0 z-[1]" />
                <div className="h-[2px] w-[21px] bg-customColor25 absolute top-[30px] right-0 z-[1]" />
              </div>
              <div className="flex-1">
                <CommentBox
                  type="input"
                  onChange={addChildrenComment(comment)}
                />
              </div>
            </div>
          </>
        ))}
        <CommentBox type="textarea" onChange={addComment} />
      </div>
    </div>
  );
};
