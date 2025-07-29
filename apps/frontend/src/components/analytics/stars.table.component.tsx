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
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const UpDown: FC<{
  name: string;
  param: string;
}> = (props) => {
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
        {['none', 'asc'].indexOf(state) > -1 && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="4"
            viewBox="0 0 22 12"
            fill="none"
          >
            <path
              d="M21.9245 11.3823C21.8489 11.5651 21.7207 11.7213 21.5563 11.8312C21.3919 11.9411 21.1986 11.9998 21.0008 11.9998H1.00079C0.802892 12 0.609399 11.9414 0.444805 11.8315C0.280212 11.7217 0.151917 11.5654 0.076165 11.3826C0.000412494 11.1998 -0.0193921 10.9986 0.0192583 10.8045C0.0579087 10.6104 0.153276 10.4322 0.293288 10.2923L10.2933 0.29231C10.3862 0.199333 10.4964 0.125575 10.6178 0.0752506C10.7392 0.0249263 10.8694 -0.000976562 11.0008 -0.000976562C11.1322 -0.000976562 11.2623 0.0249263 11.3837 0.0752506C11.5051 0.125575 11.6154 0.199333 11.7083 0.29231L21.7083 10.2923C21.8481 10.4322 21.9433 10.6105 21.9818 10.8045C22.0202 10.9985 22.0003 11.1996 21.9245 11.3823Z"
              fill="#94A3B8"
            />
          </svg>
        )}
        {['none', 'desc'].indexOf(state) > -1 && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="9"
            height="4"
            viewBox="0 0 22 12"
            fill="none"
            className="rotate-180"
          >
            <path
              d="M21.9245 11.3823C21.8489 11.5651 21.7207 11.7213 21.5563 11.8312C21.3919 11.9411 21.1986 11.9998 21.0008 11.9998H1.00079C0.802892 12 0.609399 11.9414 0.444805 11.8315C0.280212 11.7217 0.151917 11.5654 0.076165 11.3826C0.000412494 11.1998 -0.0193921 10.9986 0.0192583 10.8045C0.0579087 10.6104 0.153276 10.4322 0.293288 10.2923L10.2933 0.29231C10.3862 0.199333 10.4964 0.125575 10.6178 0.0752506C10.7392 0.0249263 10.8694 -0.000976562 11.0008 -0.000976562C11.1322 -0.000976562 11.2623 0.0249263 11.3837 0.0752506C11.5051 0.125575 11.6154 0.199333 11.7083 0.29231L21.7083 10.2923C21.8481 10.4322 21.9433 10.6105 21.9818 10.8045C22.0202 10.9985 22.0003 11.1996 21.9245 11.3823Z"
              fill="#94A3B8"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
export const StarsTableComponent = () => {
  const t = useT();
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
            ...(key && state
              ? {
                  key,
                  state,
                }
              : {}),
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M13.1644 15.5866C13.3405 15.7628 13.4395 16.0016 13.4395 16.2507C13.4395 16.4998 13.3405 16.7387 13.1644 16.9148C12.9883 17.0909 12.7494 17.1898 12.5003 17.1898C12.2513 17.1898 12.0124 17.0909 11.8363 16.9148L5.58629 10.6648C5.49889 10.5777 5.42954 10.4742 5.38222 10.3602C5.3349 10.2463 5.31055 10.1241 5.31055 10.0007C5.31055 9.87732 5.3349 9.75515 5.38222 9.64119C5.42954 9.52724 5.49889 9.42375 5.58629 9.33665L11.8363 3.08665C12.0124 2.91053 12.2513 2.81158 12.5003 2.81158C12.7494 2.81158 12.9883 2.91053 13.1644 3.08665C13.3405 3.26277 13.4395 3.50164 13.4395 3.75071C13.4395 3.99978 13.3405 4.23865 13.1644 4.41477L7.57925 9.99993L13.1644 15.5866Z"
              fill="#E9E9F1"
            />
          </svg>
        </div>
        <h2 className="text-[24px]">{t('stars_per_day', 'Stars per day')}</h2>
        <div
          onClick={changePage('increase')}
          className={clsx(
            !isLoadingStars &&
              (loading || stars?.stars?.length < 10) &&
              'opacity-50 pointer-events-none'
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M14.4137 10.6633L8.16374 16.9133C7.98761 17.0894 7.74874 17.1884 7.49967 17.1884C7.2506 17.1884 7.01173 17.0894 6.83561 16.9133C6.65949 16.7372 6.56055 16.4983 6.56055 16.2492C6.56055 16.0002 6.65949 15.7613 6.83561 15.5852L12.4223 10L6.83717 4.41331C6.74997 4.3261 6.68079 4.22257 6.6336 4.10863C6.5864 3.99469 6.56211 3.87257 6.56211 3.74925C6.56211 3.62592 6.5864 3.5038 6.6336 3.38986C6.68079 3.27592 6.74997 3.17239 6.83717 3.08518C6.92438 2.99798 7.02791 2.9288 7.14185 2.88161C7.25579 2.83441 7.37791 2.81012 7.50124 2.81012C7.62456 2.81012 7.74668 2.83441 7.86062 2.88161C7.97456 2.9288 8.07809 2.99798 8.1653 3.08518L14.4153 9.33518C14.5026 9.42238 14.5718 9.52596 14.619 9.63997C14.6662 9.75398 14.6904 9.87618 14.6903 9.99957C14.6901 10.123 14.6656 10.2451 14.6182 10.359C14.5707 10.4729 14.5012 10.5763 14.4137 10.6633Z"
              fill="#E9E9F1"
            />
          </svg>
        </div>
        <div>
          {loading && (
            <ReactLoading type="spin" color="#fff" width={20} height={20} />
          )}
        </div>
      </div>
      <div className="flex-1 bg-secondary">
        {stars?.stars?.length ? (
          <table className={`table1`}>
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
                <th>{t('media', 'Media')}</th>
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
                      <Button>{t('check_launch', 'Check Launch')}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-[24px] px-[16px]">
            {t(
              'load_your_github_repository_from_settings_to_see_analytics',
              'Load your GitHub repository from settings to see analytics'
            )}
          </div>
        )}
      </div>
    </div>
  );
};
