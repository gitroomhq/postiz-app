'use client';
import { __awaiter } from "tslib";
import 'reflect-metadata';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { useSearchParams } from 'next/navigation';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { extend } from 'dayjs';
import useCookie from 'react-use-cookie';
import { newDayjs } from "../layout/set.timezone";
import { expandPostsList, expandPosts } from "../../../../../libraries/helpers/src/utils/posts.list.minify";
extend(isoWeek);
extend(weekOfYear);
export const CalendarContext = createContext({
    startDate: newDayjs().startOf('isoWeek').format('YYYY-MM-DD'),
    endDate: newDayjs().endOf('isoWeek').format('YYYY-MM-DD'),
    customer: null,
    loading: true,
    sets: [],
    signature: undefined,
    comments: [],
    integrations: [],
    trendings: [],
    posts: [],
    reloadCalendarView: () => {
        /** empty **/
    },
    display: 'week',
    setFilters: (filters) => {
        /** empty **/
    },
    changeDate: (id, date) => {
        /** empty **/
    },
    // List view specific
    listPosts: [],
    listPage: 0,
    listTotalPages: 0,
    setListPage: (page) => {
        /** empty **/
    },
});
// Helper function to get start and end dates based on display type
function getDateRange(display, referenceDate) {
    const date = referenceDate ? newDayjs(referenceDate) : newDayjs();
    switch (display) {
        case 'day':
            return {
                startDate: date.format('YYYY-MM-DD'),
                endDate: date.format('YYYY-MM-DD'),
            };
        case 'week':
            return {
                startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
                endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
            };
        case 'month':
            return {
                startDate: date.startOf('month').format('YYYY-MM-DD'),
                endDate: date.endOf('month').format('YYYY-MM-DD'),
            };
        default:
            return {
                startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
                endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
            };
    }
}
export const CalendarWeekProvider = ({ children, integrations }) => {
    const fetch = useFetch();
    const [internalData, setInternalData] = useState([]);
    const [trendings] = useState([]);
    const searchParams = useSearchParams();
    const [displaySaved, setDisplaySaved] = useCookie('calendar-display', 'week');
    const display = searchParams.get('display') || displaySaved;
    // List view state
    const [listPage, setListPage] = useState(0);
    // Initialize with current date range based on URL params or defaults
    const initStartDate = searchParams.get('startDate');
    const initEndDate = searchParams.get('endDate');
    const initCustomer = searchParams.get('customer');
    const initialRange = initStartDate && initEndDate
        ? { startDate: initStartDate, endDate: initEndDate }
        : getDateRange(display);
    const [filters, setFilters] = useState({
        startDate: initialRange.startDate,
        endDate: initialRange.endDate,
        customer: initCustomer || null,
        display,
    });
    const params = useMemo(() => {
        var _a;
        return new URLSearchParams({
            display: filters.display,
            startDate: filters.startDate,
            endDate: filters.endDate,
            customer: ((_a = filters === null || filters === void 0 ? void 0 : filters.customer) === null || _a === void 0 ? void 0 : _a.toString()) || '',
        }).toString();
    }, [filters]);
    // Calendar view data fetcher
    const loadData = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const modifiedParams = new URLSearchParams({
            display: filters.display,
            customer: ((_a = filters === null || filters === void 0 ? void 0 : filters.customer) === null || _a === void 0 ? void 0 : _a.toString()) || '',
            startDate: newDayjs(filters.startDate).startOf('day').utc().format(),
            endDate: newDayjs(filters.endDate).endOf('day').utc().format(),
        }).toString();
        const data = yield (yield fetch(`/posts?${modifiedParams}`)).json();
        return expandPosts(data);
    }), [filters, params]);
    // List view data fetcher
    const listParams = useMemo(() => {
        var _a;
        return new URLSearchParams({
            page: listPage.toString(),
            limit: '100',
            customer: ((_a = filters === null || filters === void 0 ? void 0 : filters.customer) === null || _a === void 0 ? void 0 : _a.toString()) || '',
        }).toString();
    }, [listPage, filters.customer]);
    const loadListData = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield fetch(`/posts/list?${listParams}`);
        return expandPostsList(yield response.json());
    }), [listParams]);
    // SWR for calendar view
    const { data: calendarData, isLoading: calendarIsLoading, mutate: mutateCalendar, } = useSWR(filters.display !== 'list' ? `/posts-${params}` : null, loadData, {
        refreshInterval: 3600000,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
        revalidateOnFocus: false,
    });
    // SWR for list view
    const { data: listData, isLoading: listIsLoading, mutate: mutateList, } = useSWR(filters.display === 'list' ? `/posts-list-${listParams}` : null, loadListData, {
        refreshInterval: 3600000,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
        revalidateOnFocus: false,
    });
    const defaultSign = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return yield (yield fetch('/signatures/default')).json();
    }), []);
    const setList = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/sets')).json();
    }), []);
    const { data: sets, mutate } = useSWR('sets', setList, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const { data: sign } = useSWR('default-sign', defaultSign, {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        revalidateOnMount: true,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
    });
    const setFiltersWrapper = useCallback((newFilters) => {
        setDisplaySaved(newFilters.display);
        setFilters(newFilters);
        setInternalData([]);
        // Reset page when switching to list view
        if (newFilters.display === 'list') {
            setListPage(0);
        }
        const path = [
            `startDate=${newFilters.startDate}`,
            `endDate=${newFilters.endDate}`,
            `display=${newFilters.display}`,
            newFilters.customer ? `customer=${newFilters.customer}` : ``,
        ].filter((f) => f);
        window.history.replaceState(null, '', `/launches?${path.join('&')}`);
    }, []);
    const posts = useMemo(() => (calendarData === null || calendarData === void 0 ? void 0 : calendarData.posts) || [], [calendarData === null || calendarData === void 0 ? void 0 : calendarData.posts]);
    const comments = useMemo(() => (calendarData === null || calendarData === void 0 ? void 0 : calendarData.comments) || [], [calendarData === null || calendarData === void 0 ? void 0 : calendarData.comments]);
    // List view data
    const listPosts = useMemo(() => (listData === null || listData === void 0 ? void 0 : listData.posts) || [], [listData === null || listData === void 0 ? void 0 : listData.posts]);
    const listTotal = (listData === null || listData === void 0 ? void 0 : listData.total) || 0;
    const listTotalPages = Math.ceil(listTotal / 100);
    const changeDate = useCallback((id, date) => {
        setInternalData((d) => d.map((post) => {
            if (post.id === id) {
                return Object.assign(Object.assign({}, post), { publishDate: date.utc().format('YYYY-MM-DDTHH:mm:ss') });
            }
            return post;
        }));
    }, [posts, internalData]);
    useEffect(() => {
        if (posts) {
            setInternalData(posts);
        }
    }, [posts]);
    // Combined reload function that handles both calendar and list views
    const reloadCalendarView = useCallback(() => {
        mutateCalendar();
        mutateList();
    }, [mutateCalendar, mutateList]);
    // Determine loading state based on current view
    const loading = filters.display === 'list' ? listIsLoading : calendarIsLoading;
    return (<CalendarContext.Provider value={Object.assign(Object.assign({ trendings,
            reloadCalendarView }, filters), { posts: calendarIsLoading ? [] : internalData, loading,
            integrations, setFilters: setFiltersWrapper, changeDate,
            comments, sets: sets || [], signature: sign, 
            // List view specific
            listPosts,
            listPage,
            listTotalPages,
            setListPage })}>
      {children}
    </CalendarContext.Provider>);
};
export const useCalendar = () => useContext(CalendarContext);
//# sourceMappingURL=calendar.context.js.map