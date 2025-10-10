import { FC, useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Textarea } from '@gitroom/react/form/textarea';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Input } from '@gitroom/react/form/input';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
export const CommentBox: FC<{
  value?: string;
  type: 'textarea' | 'input';
  onChange: (comment: string) => void;
}> = (props) => {
  const { value, onChange, type } = props;
  const Component = type === 'textarea' ? Textarea : Input;
  const [newComment, setNewComment] = useState(value || '');
  const newCommentFunc = useCallback(
    (event: {
      target: {
        value: string;
      };
    }) => {
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
  user: {
    email: string;
    id: string;
  };
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
          <svg
            onClick={() => setEditMode(!editMode)}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M28.415 9.17119L22.8288 3.58619C22.643 3.40043 22.4225 3.25307 22.1799 3.15253C21.9372 3.05199 21.6771 3.00024 21.4144 3.00024C21.1517 3.00024 20.8916 3.05199 20.6489 3.15253C20.4062 3.25307 20.1857 3.40043 20 3.58619L4.58626 18.9999C4.39973 19.185 4.25185 19.4053 4.15121 19.648C4.05057 19.8907 3.99917 20.151 4.00001 20.4137V25.9999C4.00001 26.5304 4.21072 27.0391 4.5858 27.4142C4.96087 27.7892 5.46958 27.9999 6.00001 27.9999H27C27.2652 27.9999 27.5196 27.8946 27.7071 27.7071C27.8947 27.5195 28 27.2652 28 26.9999C28 26.7347 27.8947 26.4804 27.7071 26.2928C27.5196 26.1053 27.2652 25.9999 27 25.9999H14.415L28.415 11.9999C28.6008 11.8142 28.7481 11.5937 28.8487 11.351C28.9492 11.1084 29.001 10.8482 29.001 10.5856C29.001 10.3229 28.9492 10.0628 28.8487 9.82009C28.7481 9.57741 28.6008 9.35692 28.415 9.17119ZM11.5863 25.9999H6.00001V20.4137L17 9.41369L22.5863 14.9999L11.5863 25.9999ZM24 13.5862L18.415 7.99994L21.415 4.99994L27 10.5862L24 13.5862Z"
              fill="#fff"
            />
          </svg>

          <svg
            onClick={deleteCommentFunction}
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M27 6H22V5C22 4.20435 21.6839 3.44129 21.1213 2.87868C20.5587 2.31607 19.7956 2 19 2H13C12.2044 2 11.4413 2.31607 10.8787 2.87868C10.3161 3.44129 10 4.20435 10 5V6H5C4.73478 6 4.48043 6.10536 4.29289 6.29289C4.10536 6.48043 4 6.73478 4 7C4 7.26522 4.10536 7.51957 4.29289 7.70711C4.48043 7.89464 4.73478 8 5 8H6V26C6 26.5304 6.21071 27.0391 6.58579 27.4142C6.96086 27.7893 7.46957 28 8 28H24C24.5304 28 25.0391 27.7893 25.4142 27.4142C25.7893 27.0391 26 26.5304 26 26V8H27C27.2652 8 27.5196 7.89464 27.7071 7.70711C27.8946 7.51957 28 7.26522 28 7C28 6.73478 27.8946 6.48043 27.7071 6.29289C27.5196 6.10536 27.2652 6 27 6ZM12 5C12 4.73478 12.1054 4.48043 12.2929 4.29289C12.4804 4.10536 12.7348 4 13 4H19C19.2652 4 19.5196 4.10536 19.7071 4.29289C19.8946 4.48043 20 4.73478 20 5V6H12V5ZM24 26H8V8H24V26ZM14 13V21C14 21.2652 13.8946 21.5196 13.7071 21.7071C13.5196 21.8946 13.2652 22 13 22C12.7348 22 12.4804 21.8946 12.2929 21.7071C12.1054 21.5196 12 21.2652 12 21V13C12 12.7348 12.1054 12.4804 12.2929 12.2929C12.4804 12.1054 12.7348 12 13 12C13.2652 12 13.5196 12.1054 13.7071 12.2929C13.8946 12.4804 14 12.7348 14 13ZM20 13V21C20 21.2652 19.8946 21.5196 19.7071 21.7071C19.5196 21.8946 19.2652 22 19 22C18.7348 22 18.4804 21.8946 18.2929 21.7071C18.1054 21.5196 18 21.2652 18 21V13C18 12.7348 18.1054 12.4804 18.2929 12.2929C18.4804 12.1054 18.7348 12 19 12C19.2652 12 19.5196 12.1054 19.7071 12.2929C19.8946 12.4804 20 12.7348 20 13Z"
              fill="#fff"
            />
          </svg>
        </>
      )}
    </div>
  );
};
export const CommentComponent: FC<{
  date: dayjs.Dayjs;
}> = (props) => {
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
          user: {
            email: user?.email!,
            id: user?.id!,
          },
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
                  user: {
                    email: user?.email!,
                    id: user?.id!,
                  },
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
        className="outline-none absolute end-[20px] top-[15px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
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
                    className={`rounded-full relative z-[2] text-blue-500 font-bold flex justify-center items-center w-[40px] h-[40px] bg-white border-tableBorder border`}
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
                        className={`rounded-full relative z-[2] text-blue-500 font-bold flex justify-center items-center w-[40px] h-[40px] bg-white border-tableBorder border`}
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
                <div className="h-[2px] w-[21px] bg-customColor25 absolute top-[30px] end-0 z-[1]" />
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
