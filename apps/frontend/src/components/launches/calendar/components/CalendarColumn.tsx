import React, { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@mantine/modals';
import { useAddProvider } from '@gitroom/frontend/components/launches/add.provider.component';
import { useDrop } from 'react-dnd';
import { random } from 'lodash';
import { useInterval } from '@mantine/hooks';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { PreviewPopup } from '@gitroom/frontend/components/marketplace/special.message';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { Fragment } from 'react';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { CalendarItem } from './CalendarItem';
import { SetSelectionModal } from './SetSelectionModal';

interface CalendarColumnProps {
    getDate: dayjs.Dayjs;
    randomHour?: boolean;
}

export const CalendarColumn: FC<CalendarColumnProps> = memo((props) => {
    const t = useT();
    const { getDate, randomHour } = props;
    const [num, setNum] = useState(0);
    const user = useUser();
    const {
        integrations,
        posts,
        trendings,
        changeDate,
        display,
        reloadCalendarView,
        sets,
        signature,
    } = useCalendar();
    const toaster = useToaster();
    const modal = useModals();
    const fetch = useFetch();

    const postList = useMemo(() => {
        return posts.filter((post) => {
            const pList = dayjs.utc(post.publishDate).local();
            const check =
                display === 'day'
                    ? pList.format('YYYY-MM-DD HH:mm') ===
                    getDate.format('YYYY-MM-DD HH:mm')
                    : display === 'week'
                        ? pList.isSameOrAfter(getDate.startOf('hour')) &&
                        pList.isBefore(getDate.endOf('hour'))
                        : pList.format('DD/MM/YYYY') === getDate.format('DD/MM/YYYY');
            return check;
        });
    }, [posts, display, getDate]);

    const [showAll, setShowAll] = useState(false);
    const showAllFunc = useCallback(() => setShowAll(true), []);
    const showLessFunc = useCallback(() => setShowAll(false), []);

    const list = useMemo(() => {
        if (showAll) return postList;
        return postList.slice(0, 3);
    }, [postList, showAll]);

    const canBeTrending = useMemo(() => {
        return !!trendings.find((trend) => {
            return dayjs
                .utc(trend)
                .local()
                .isBetween(getDate, getDate.add(10, 'minute'), 'minute', '[)');
        });
    }, [trendings, getDate]);

    const isBeforeNow = useMemo(() => {
        return getDate.startOf('hour').isBefore(dayjs().startOf('hour'));
    }, [getDate, num]);

    const { start, stop } = useInterval(
        useCallback(() => {
            if (isBeforeNow) return;
            setNum(num + 1);
        }, [isBeforeNow, num]),
        random(120000, 150000)
    );

    useEffect(() => {
        start();
        return () => stop();
    }, [start, stop]);

    const [{ canDrop }, drop] = useDrop(() => ({
        accept: 'post',
        drop: async (item: any) => {
            if (isBeforeNow) return;
            const { status } = await fetch(`/posts/${item.id}/date`, {
                method: 'PUT',
                body: JSON.stringify({
                    date: getDate.utc().format('YYYY-MM-DDTHH:mm:ss'),
                }),
            });
            if (status !== 500) {
                changeDate(item.id, getDate);
                return;
            }
            toaster.show(
                t(
                    'can_t_change_date_remove_post_from_publication',
                    "Can't change date, remove post from publication"
                ),
                'warning'
            );
        },
        collect: (monitor) => ({
            canDrop: isBeforeNow ? false : !!monitor.canDrop() && !!monitor.isOver(),
        }),
    }));

    const getIntegration = useCallback(
        async (post: any) => {
            return (
                await fetch(
                    `/integrations/${post.integration.id}?order=${post.submittedForOrderId}`,
                    {
                        method: 'GET',
                    }
                )
            ).json();
        },
        []
    );

    const previewPublication = useCallback(
        async (postInfo: any) => {
            const post = await (
                await fetch(`/marketplace/posts/${postInfo.id}`)
            ).json();
            const integration = await getIntegration(postInfo);
            modal.openModal({
                classNames: {
                    modal: 'bg-transparent text-textColor',
                },
                size: 'auto',
                withCloseButton: false,
                children: (
                    <IntegrationContext.Provider
                        value={{
                            allIntegrations: [],
                            date: dayjs(),
                            integration,
                            value: [],
                        }}
                    >
                        <PreviewPopup
                            providerId={post?.providerId!}
                            post={post}
                            postId={post.id}
                        />
                    </IntegrationContext.Provider>
                ),
            });
        },
        []
    );

    const editPost = useCallback(
        (loadPost: any, isDuplicate?: boolean) =>
            async () => {
                const post = {
                    ...loadPost,
                    publishDate: loadPost.actualDate || loadPost.publishDate,
                };
                if (user?.orgId === post.submittedForOrganizationId) {
                    return previewPublication(post);
                }
                const data = await (await fetch(`/posts/${post.id}`)).json();
                const date = !isDuplicate
                    ? null
                    : (await (await fetch('/posts/find-slot')).json()).date;
                const publishDate = dayjs.utc(date || data.posts[0].publishDate).local();
                const ExistingData = !isDuplicate
                    ? ExistingDataContextProvider
                    : Fragment;
                modal.openModal({
                    closeOnClickOutside: false,
                    closeOnEscape: false,
                    withCloseButton: false,
                    classNames: {
                        modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
                    },
                    children: (
                        <ExistingData value={data}>
                            <AddEditModal
                                {...(isDuplicate
                                    ? {
                                        onlyValues: data.posts.map(
                                            ({ image, settings, content }: any) => ({
                                                image,
                                                settings,
                                                content,
                                            })
                                        ),
                                    }
                                    : {})}
                                allIntegrations={integrations.map((p) => ({ ...p }))}
                                reopenModal={editPost(post)}
                                mutate={reloadCalendarView}
                                integrations={
                                    isDuplicate
                                        ? integrations
                                        : integrations
                                            .slice(0)
                                            .filter((f) => f.id === data.integration)
                                            .map((p) => ({
                                                ...p,
                                                picture: data.integrationPicture,
                                            }))
                                }
                                date={publishDate}
                            />
                        </ExistingData>
                    ),
                    size: '80%',
                    title: ``,
                });
            },
        [integrations, user?.orgId]
    );

    const addModal = useCallback(async () => {
        const set: any = !sets.length
            ? undefined
            : await new Promise((resolve) => {
                modal.openModal({
                    title: t('select_set', 'Select a Set'),
                    closeOnClickOutside: true,
                    closeOnEscape: true,
                    withCloseButton: true,
                    onClose: () => resolve('exit'),
                    classNames: {
                        modal: 'bg-secondary text-textColor',
                    },
                    children: (
                        <SetSelectionModal
                            sets={sets}
                            onSelect={(selectedSet) => {
                                resolve(selectedSet);
                                modal.closeAll();
                            }}
                            onContinueWithoutSet={() => {
                                resolve(undefined);
                                modal.closeAll();
                            }}
                        />
                    ),
                });
            });

        if (set === 'exit') return;

        modal.openModal({
            closeOnClickOutside: false,
            closeOnEscape: false,
            withCloseButton: false,
            classNames: {
                modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
            },
            children: (
                <AddEditModal
                    allIntegrations={integrations.map((p) => ({
                        ...p,
                    }))}
                    integrations={integrations.slice(0).map((p) => ({
                        ...p,
                    }))}
                    mutate={reloadCalendarView}
                    {...(signature?.id && !set
                        ? {
                            onlyValues: [
                                {
                                    content: '\n' + signature.content,
                                },
                            ],
                        }
                        : {})}
                    date={
                        randomHour ? getDate.hour(Math.floor(Math.random() * 24)) : getDate
                    }
                    {...(set?.content ? { set: JSON.parse(set.content) } : {})}
                    reopenModal={() => ({})}
                />
            ),
            size: '80%',
        });
    }, [integrations, getDate, sets, signature, randomHour]);

    const openStatistics = useCallback(
        (id: string) => () => {
            modal.openModal({
                closeOnClickOutside: true,
                closeOnEscape: true,
                withCloseButton: false,
                classNames: {
                    modal: 'w-[100%] max-w-[1400px] bg-transparent text-textColor',
                },
                children: <StatisticsModal postId={id} />,
                size: '80%',
            });
        },
        []
    );

    const deletePost = useCallback(
        (post: any) => async () => {
            if (
                !(await deleteDialog(
                    t(
                        'are_you_sure_you_want_to_delete_post',
                        'Are you sure you want to delete post?'
                    )
                ))
            ) {
                return;
            }

            await fetch(`/posts/${post.group}`, {
                method: 'DELETE',
            });

            toaster.show(
                t('post_deleted_successfully', 'Post deleted successfully'),
                'success'
            );

            reloadCalendarView();
        },
        [toaster, t]
    );

    const addProvider = useAddProvider();

    return (
        <div className="flex flex-col w-full min-h-full" ref={drop}>
            {display === 'month' && (
                <div className={clsx('pt-[5px]', isBeforeNow && 'bg-customColor23')}>
                    {getDate.date()}
                </div>
            )}
            <div
                className={clsx(
                    'relative flex flex-col flex-1 text-white',
                    canDrop && 'bg-white/80',
                    isBeforeNow && postList.length === 0 && 'cursor-not-allowed'
                )}
            >
                <div
                    {...(canBeTrending
                        ? {
                            'data-tooltip-id': 'tooltip',
                            'data-tooltip-content': t(
                                'predicted_github_trending_change',
                                'Predicted GitHub Trending Change'
                            ),
                        }
                        : {})}
                    className={clsx(
                        'flex-col text-[12px] pointer w-full flex scrollbar scrollbar-thumb-tableBorder scrollbar-track-secondary',
                        isBeforeNow ? 'bg-customColor23 flex-1' : 'cursor-pointer',
                        isBeforeNow && postList.length === 0 && 'col-calendar',
                        canBeTrending && 'bg-customColor24'
                    )}
                >
                    {list.map((post) => (
                        <div
                            key={post.id}
                            className={clsx(
                                'text-textColor p-[2.5px] relative flex flex-col justify-center items-center'
                            )}
                        >
                            <div className="relative w-full flex flex-col items-center p-[2.5px] h-[66px]">
                                <CalendarItem
                                    display={display as 'day' | 'week' | 'month'}
                                    isBeforeNow={isBeforeNow}
                                    date={getDate}
                                    state={post.state}
                                    statistics={openStatistics(post.id)}
                                    editPost={editPost(post, false)}
                                    duplicatePost={editPost(post, true)}
                                    post={post}
                                    integrations={integrations}
                                    deletePost={deletePost(post)}
                                />
                            </div>
                        </div>
                    ))}
                    {!showAll && postList.length > 3 && (
                        <div
                            className="text-center hover:underline py-[5px] text-textColor"
                            onClick={showAllFunc}
                        >
                            {t('show_more', '+ Show more')} ({postList.length - 3})
                        </div>
                    )}
                    {showAll && postList.length > 3 && (
                        <div
                            className="text-center hover:underline py-[5px]"
                            onClick={showLessFunc}
                        >
                            {t('show_less', '- Show less')}
                        </div>
                    )}
                </div>
                {(display === 'day'
                    ? !isBeforeNow && postList.length === 0
                    : !isBeforeNow) && (
                        <div
                            className="pb-[2.5px] px-[5px] flex-1 flex"
                            onClick={integrations.length ? addModal : addProvider}
                        >
                            <div
                                className={clsx(
                                    display === ('month' as any)
                                        ? 'flex-1 min-h-[40px] w-full'
                                        : !postList.length
                                            ? 'h-full w-full absolute start-0 top-0 p-[5px]'
                                            : 'min-h-[40px] w-full',
                                    'flex items-center justify-center cursor-pointer pb-[2.5px]'
                                )}
                            >
                                {display !== 'day' && (
                                    <div
                                        className={clsx(
                                            'hover:before:content-["+"] w-full h-full text-seventh rounded-[10px] hover:border hover:border-seventh flex justify-center items-center'
                                        )}
                                    />
                                )}
                                {display === 'day' && (
                                    <div
                                        className={`w-full h-full rounded-[10px] hover:border hover:border-seventh flex justify-center items-center gap-[20px] opacity-30 grayscale hover:grayscale-0 hover:opacity-100`}
                                    >
                                        {integrations.map((selectedIntegrations) => (
                                            <div
                                                className="relative"
                                                key={selectedIntegrations.identifier}
                                            >
                                                <div
                                                    className={clsx(
                                                        'relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500'
                                                    )}
                                                >
                                                    <img
                                                        src={selectedIntegrations.picture || '/no-picture.jpg'}
                                                        className="rounded-full w-[32px] h-[32px]"
                                                        alt={selectedIntegrations.identifier}
                                                    />
                                                    {selectedIntegrations.identifier === 'youtube' ? (
                                                        <img
                                                            src="/icons/platforms/youtube.svg"
                                                            className="absolute z-10 -bottom-[5px] -end-[5px]"
                                                            width={20}
                                                        />
                                                    ) : (
                                                        <img
                                                            src={`/icons/platforms/${selectedIntegrations.identifier}.png`}
                                                            className="rounded-full absolute z-10 -bottom-[5px] -end-[5px] border border-fifth w-[20px] h-[20px]"
                                                            alt={selectedIntegrations.identifier}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
});
