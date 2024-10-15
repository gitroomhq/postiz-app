import {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { UtcToLocalDateRender } from '@gitroom/react/helpers/utc.date.render';
import { Button } from '@gitroom/react/form/button';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import ReactLoading from 'react-loading';
import interClass from '@gitroom/react/helpers/inter.font';

import { ReactComponent as ArrowUpSvg } from '@gitroom/frontend/assets/arrow-up.svg';
import { ReactComponent as ArrowLeftSvg } from '@gitroom/frontend/assets/arrow-left.svg';
import { ReactComponent as ArrowRightSvg } from '@gitroom/frontend/assets/arrow-right.svg';

export const UpDown: FC<{ name: string; param: string }> = (props) => {
  const { name, param } = props;
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    const newName = searchParams.get('key');
    const newState = searchParams.get('state');

    if (newName != param) {
      return 'none';
    }

    return newState as 'asc' | 'desc';
  }, [searchParams, name, param]);

  const changeStateUrl = useCallback(
    (newState: string) => {
      const query =
        newState === 'none' ? `` : `?key=${param}&state=${newState}`;
      router.replace(`/analytics${query}`);
    },
    [state, param]
  );

  const changeState = useCallback(() => {
    changeStateUrl(
      state === 'none' ? 'desc' : state === 'desc' ? 'asc' : 'none'
    );
  }, [state, param]);

  return (
    <div
      className="flex gap-[5px] items-center select-none"
      onClick={changeState}
    >
      <div>{name}</div>
      <div className="flex flex-col gap-[3px]">
        {['none', 'asc'].indexOf(state) > -1 && <ArrowUpSvg />}
        {['none', 'desc'].indexOf(state) > -1 && (
          <ArrowUpSvg className="rotate-180" />
        )}
      </div>
    </div>
  );
};

export const StarsTableComponent = () => {
  const fetch = useFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = +(searchParams.get('page') || 1);
  const key = searchParams.get('key');
  const state = searchParams.get('state');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const starsCallback = useCallback(
    async (path: string) => {
      startTransition(() => {
        setLoading(true);
      });
      const data = await (
        await fetch(path, {
          body: JSON.stringify({
            page,
            ...(key && state ? { key, state } : {}),
          }),
          method: 'POST',
        })
      ).json();

      startTransition(() => {
        setLoading(false);
      });

      return data;
    },
    [page, key, state]
  );

  const {
    isLoading: isLoadingStars,
    data: stars,
    mutate,
  } = useSWR('/analytics/stars', starsCallback, {
    revalidateOnMount: false,
    revalidateOnReconnect: false,
    revalidateOnFocus: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
  });

  useEffect(() => {
    mutate();
  }, [searchParams]);

  const renderMediaLink = useCallback((date: string) => {
    const local = dayjs.utc(date).local();
    const weekNumber = local.isoWeek();
    const year = local.year();
    return `/launches?week=${weekNumber}&year=${year}`;
  }, []);

  const changePage = useCallback(
    (type: 'increase' | 'decrease') => () => {
      const newPage = type === 'increase' ? page + 1 : page - 1;
      const keyAndState = key && state ? `&key=${key}&state=${state}` : '';
      router.replace(`/analytics?page=${newPage}${keyAndState}`);
    },
    [page, key, state]
  );

  return (
    <div className="flex flex-1 flex-col gap-[15px] min-h-[426px]">
      <div className="text-textColor flex gap-[8px] items-center select-none">
        <div
          onClick={changePage('decrease')}
          className={clsx(
            (page === 1 || loading) && 'opacity-50 pointer-events-none'
          )}
        >
          <ArrowLeftSvg />
        </div>
        <h2 className="text-[24px]">Stars per day</h2>
        <div
          onClick={changePage('increase')}
          className={clsx(
            !isLoadingStars &&
              (loading || stars?.stars?.length < 10) &&
              'opacity-50 pointer-events-none'
          )}
        >
          <ArrowRightSvg />
        </div>
        <div>
          {loading && (
            <ReactLoading type="spin" color="#fff" width={20} height={20} />
          )}
        </div>
      </div>
      <div className="flex-1 bg-secondary">
        {stars?.stars?.length ? (
          <table className={`table1 ${interClass}`}>
            <thead>
              <tr>
                <th>
                  <UpDown name="Repository" param="login" />
                </th>
                <th>
                  <UpDown name="Date" param="date" />
                </th>
                <th>
                  <UpDown name="Total Stars" param="totalStars" />
                </th>
                <th>
                  <UpDown name="Total Fork" param="totalForks" />
                </th>
                <th>
                  <UpDown name="Stars" param="stars" />
                </th>
                <th>
                  <UpDown name="Forks" param="forks" />
                </th>
                <th>Media</th>
              </tr>
            </thead>
            <tbody>
              {stars?.stars?.map((p: any) => (
                <tr key={p.date}>
                  <td>{p.login}</td>
                  <td>
                    <UtcToLocalDateRender date={p.date} format="DD/MM/YYYY" />
                  </td>
                  <td>{p.totalStars}</td>
                  <td>{p.totalForks}</td>

                  <td>{p.stars}</td>
                  <td>{p.forks}</td>
                  <td>
                    <Link href={renderMediaLink(p.date)}>
                      <Button>Check Launch</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-[24px] px-[16px]">
            Load your GitHub repository from settings to see analytics
          </div>
        )}
      </div>
    </div>
  );
};
