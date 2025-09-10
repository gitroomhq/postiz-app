import { FC, memo, useCallback } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useDrag } from 'react-dnd';
import clsx from 'clsx';
import removeMd from 'remove-markdown';
import { CalendarItemProps } from '../types';
import { Duplicate, Preview, Statistics, DeletePost } from '../icons';

export const CalendarItem: FC<CalendarItemProps> = memo((props) => {
    const t = useT();
    const {
        editPost,
        statistics,
        duplicatePost,
        post,
        date,
        isBeforeNow,
        state,
        display,
        deletePost,
    } = props;

    const { disableXAnalytics } = useVariables();

    const preview = useCallback(() => {
        window.open(`/p/` + post.id + '?share=true', '_blank');
    }, [post]);

    const [{ opacity }, dragRef] = useDrag(
        () => ({
            type: 'post',
            item: {
                id: post.id,
                date,
            },
            collect: (monitor) => ({
                opacity: monitor.isDragging() ? 0 : 1,
            }),
        }),
        []
    );

    return (
        <div
            ref={dragRef}
            className={clsx('w-full flex h-full flex-1 flex-col group', 'relative')}
            style={{ opacity }}
        >
            <div
                className={clsx(
                    'text-white bg-forth text-[11px] h-[15px] w-full rounded-tr-[10px] rounded-tl-[10px] flex justify-center gap-[10px] px-[5px]'
                )}
                style={{
                    backgroundColor: post?.tags?.[0]?.tag?.color,
                }}
            >
                <div
                    className={clsx(
                        post?.tags?.[0]?.tag?.color ? 'mix-blend-difference' : '',
                        'group-hover:hidden cursor-pointer'
                    )}
                >
                    {post.tags.map((p) => p.tag.name).join(', ')}
                </div>
                <div
                    className={clsx(
                        'hidden group-hover:block hover:underline cursor-pointer',
                        post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
                    )}
                    onClick={duplicatePost}
                >
                    <Duplicate />
                </div>
                <div
                    className={clsx(
                        'hidden group-hover:block hover:underline cursor-pointer',
                        post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
                    )}
                    onClick={preview}
                >
                    <Preview />
                </div>
                {post.integration.providerIdentifier === 'x' && disableXAnalytics ? (
                    <></>
                ) : (
                    <div
                        className={clsx(
                            'hidden group-hover:block hover:underline cursor-pointer',
                            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
                        )}
                        onClick={statistics}
                    >
                        <Statistics />
                    </div>
                )}
                <div
                    className={clsx(
                        'hidden group-hover:block hover:underline cursor-pointer',
                        post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
                    )}
                    onClick={deletePost}
                >
                    <DeletePost />
                </div>
            </div>
            <div
                onClick={editPost}
                className={clsx(
                    'gap-[5px] w-full flex h-full flex-1 rounded-br-[10px] rounded-bl-[10px] border border-seventh px-[5px] p-[2.5px]',
                    'relative',
                    isBeforeNow && '!grayscale'
                )}
            >
                <div
                    className={clsx(
                        'relative min-w-[20px] h-[20px]',
                        display === 'day' ? 'h-[40px]' : 'h-[20px]'
                    )}
                >
                    <img
                        className="w-[20px] h-[20px] rounded-full"
                        src={post.integration.picture! || '/no-picture.jpg'}
                        alt={post.integration.identifier}
                    />
                    <img
                        className="w-[12px] h-[12px] rounded-full absolute z-10 top-[10px] end-0 border border-fifth"
                        src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
                        alt={post.integration.providerIdentifier}
                    />
                </div>
                <div className="whitespace-nowrap line-clamp-2">
                    <div className="text-start">
                        {state === 'DRAFT' ? t('draft', 'Draft') + ': ' : ''}
                    </div>
                    <div className="w-full overflow-hidden overflow-ellipsis text-start">
                        {removeMd(post.content).replace(/\n/g, ' ')}
                    </div>
                </div>
            </div>
        </div>
    );
});
