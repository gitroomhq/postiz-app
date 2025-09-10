import React, { Fragment, useMemo } from 'react';
import dayjs from 'dayjs';
import i18next from 'i18next';
import { groupBy, sortBy } from 'lodash';
import { CalendarContext, useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { CalendarColumn } from './CalendarColumn';
import { isUSCitizen } from '../helpers/isuscitizen.utils';

export const DayView = () => {
    const calendar = useCalendar();
    const { integrations, posts, currentYear, currentDay, currentWeek } = calendar;

    // Set dayjs locale based on current language
    const currentLanguage = i18next.resolvedLanguage || 'en';
    dayjs.locale(currentLanguage);

    const options = useMemo(() => {
        const createdPosts = posts.map((post) => ({
            integration: [integrations.find((i) => i.id === post.integration.id)!],
            image: post.integration.picture,
            identifier: post.integration.providerIdentifier,
            id: post.integration.id,
            name: post.integration.name,
            time: dayjs
                .utc(post.publishDate)
                .diff(dayjs.utc(post.publishDate).startOf('day'), 'minute'),
        }));
        return sortBy(
            Object.values(
                groupBy(
                    [
                        ...createdPosts,
                        ...integrations.flatMap((p) =>
                            p.time.flatMap((t) => ({
                                integration: p,
                                identifier: p.identifier,
                                name: p.name,
                                id: p.id,
                                image: p.picture,
                                time: t.time,
                            }))
                        ),
                    ],
                    (p: any) => p.time
                )
            ),
            (p) => p[0].time
        );
    }, [integrations, posts]);

    return (
        <div className="flex flex-col gap-[10px]">
            {options.map((option) => (
                <Fragment key={option[0].time}>
                    <div className="text-center text-[20px]">
                        {dayjs()
                            .utc()
                            .startOf('day')
                            .add(option[0].time, 'minute')
                            .local()
                            .format(isUSCitizen() ? 'hh:mm A' : 'LT')}
                    </div>
                    <div
                        key={option[0].time}
                        className="bg-secondary min-h-[60px] border-[2px] border-secondary rounded-[10px] flex justify-center items-center gap-[10px] mb-[20px]"
                    >
                        <CalendarContext.Provider
                            value={{
                                ...calendar,
                                integrations: option.flatMap((p) => p.integration),
                            }}
                        >
                            <CalendarColumn
                                getDate={dayjs()
                                    .utc()
                                    .year(currentYear)
                                    .week(currentWeek)
                                    .day(currentDay)
                                    .startOf('day')
                                    .add(option[0].time, 'minute')
                                    .local()}
                            />
                        </CalendarContext.Provider>
                    </div>
                </Fragment>
            ))}
        </div>
    );
};
