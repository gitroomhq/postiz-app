'use client';

import { StarsAndForks } from '@gitroom/frontend/components/analytics/stars.and.forks';
import { FC, useCallback } from 'react';
import { StarsTableComponent } from '@gitroom/frontend/components/analytics/stars.table.component';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import clsx from 'clsx';
import { useStateCallback } from '@gitroom/react/helpers/use.state.callback';

export const AnalyticsComponent: FC = () => {
  const fetch = useFetch();
  const [page, setPage] = useStateCallback(1);

  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);

  const starsCallback = useCallback(
    async (path: string) => {
      return await (
        await fetch(path, {
          body: JSON.stringify({ page }),
          method: 'POST',
        })
      ).json();
    },
    [page]
  );

  const { isLoading: isLoadingAnalytics, data: analytics } = useSWR(
    '/analytics',
    load
  );
  const { isLoading: isLoadingTrending, data: trending } = useSWR(
    '/analytics/trending',
    load
  );
  const {
    isLoading: isLoadingStars,
    data: stars,
    mutate,
  } = useSWR('/analytics/stars', starsCallback);

  const changePage = useCallback(
    (type: 'increase' | 'decrease') => () => {
      setPage(type === 'increase' ? page + 1 : page - 1, () => mutate());
    },
    [page, mutate]
  );

  if (isLoadingAnalytics || isLoadingTrending || isLoadingStars) {
    return <LoadingComponent />;
  }

  return (
    <div className="flex gap-[24px] flex-1">
      <div className="flex flex-col gap-[24px] flex-1">
        <StarsAndForks
          list={analytics}
          stars={stars.stars}
          trending={trending}
        />
        <div className="flex flex-1 flex-col gap-[15px] min-h-[426px]">
          <div className="text-white flex gap-[8px] items-center select-none">
            <div
              onClick={changePage('decrease')}
              className={clsx(page === 1 && 'opacity-50 pointer-events-none')}
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
            <h2 className="text-[24px]">Stars per day</h2>
            <div
              onClick={changePage('increase')}
              className={clsx(
                !isLoadingStars &&
                  stars?.stars?.length < 10 &&
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
          </div>
          <div className="flex-1 bg-secondary">
            {stars?.stars?.length ? (
              <StarsTableComponent stars={stars.stars} />
            ) : (
              <div className="py-[24px] px-[16px]">
                Load your GitHub repository from settings to see analytics
              </div>
            )}
          </div>
        </div>
      </div>
      {/*<div className="w-[318px] bg-third mt-[-44px] p-[16px]">*/}
      {/*    <h2 className="text-[20px]">News Feed</h2>*/}
      {/*    <div className="my-[30px] flex h-[32px]">*/}
      {/*        <div className="flex-1 bg-forth flex justify-center items-center">*/}
      {/*            Global*/}
      {/*        </div>*/}
      {/*        <div className="flex-1 bg-primary flex justify-center items-center">*/}
      {/*            My Feed*/}
      {/*        </div>*/}
      {/*    </div>*/}
      {/*    <div>*/}
      {/*        <div className="w-full flex-col justify-start items-start gap-4 inline-flex">*/}
      {/*            <div className="self-stretch justify-start items-start gap-2.5 inline-flex pb-[16.5px] border-b-[1px] border-[#28344F]">*/}
      {/*                <img className="w-8 h-8 rounded-full" src="https://via.placeholder.com/32x32"/>*/}
      {/*                <div className="grow shrink basis-0 flex-col justify-start items-start gap-1 inline-flex">*/}
      {/*                    <div className="justify-center items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-white text-sm font-medium leading-tight">Nevo David</div>*/}
      {/*                        <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wide">05/06/2024</div>*/}
      {/*                    </div>*/}
      {/*                    <div className="self-stretch text-neutral-400 text-xs font-normal">O atual sistema político precisa mudar para valorizar o trabalho e garantir igualdade de oportunidad</div>*/}
      {/*                    <div className="self-stretch justify-start items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-[#E4B895] text-xs font-normal">See Tweet</div>*/}
      {/*                        <div className="w-4 h-4 relative"/>*/}
      {/*                    </div>*/}
      {/*                </div>*/}
      {/*            </div>*/}
      {/*            <div className="self-stretch justify-start items-start gap-2.5 inline-flex pb-[16.5px] border-b-[1px] border-[#28344F]">*/}
      {/*                <img className="w-8 h-8 rounded-full" src="https://via.placeholder.com/32x32"/>*/}
      {/*                <div className="grow shrink basis-0 flex-col justify-start items-start gap-1 inline-flex">*/}
      {/*                    <div className="justify-center items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-white text-sm font-medium leading-tight">Nevo David</div>*/}
      {/*                        <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wide">05/06/2024</div>*/}
      {/*                    </div>*/}
      {/*                    <div className="self-stretch text-neutral-400 text-xs font-normal">O atual sistema político precisa mudar para valorizar o trabalho e garantir igualdade de oportunidad</div>*/}
      {/*                    <div className="self-stretch justify-start items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-[#E4B895] text-xs font-normal">See Tweet</div>*/}
      {/*                        <div className="w-4 h-4 relative"/>*/}
      {/*                    </div>*/}
      {/*                </div>*/}
      {/*            </div>*/}
      {/*            <div className="self-stretch justify-start items-start gap-2.5 inline-flex pb-[16.5px] border-b-[1px] border-[#28344F]">*/}
      {/*                <img className="w-8 h-8 rounded-full" src="https://via.placeholder.com/32x32"/>*/}
      {/*                <div className="grow shrink basis-0 flex-col justify-start items-start gap-1 inline-flex">*/}
      {/*                    <div className="justify-center items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-white text-sm font-medium leading-tight">Nevo David</div>*/}
      {/*                        <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wide">05/06/2024</div>*/}
      {/*                    </div>*/}
      {/*                    <div className="self-stretch text-neutral-400 text-xs font-normal">O atual sistema político precisa mudar para valorizar o trabalho e garantir igualdade de oportunidad</div>*/}
      {/*                    <div className="self-stretch justify-start items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-[#E4B895] text-xs font-normal">See Tweet</div>*/}
      {/*                        <div className="w-4 h-4 relative"/>*/}
      {/*                    </div>*/}
      {/*                </div>*/}
      {/*            </div>*/}
      {/*            <div className="self-stretch justify-start items-start gap-2.5 inline-flex pb-[16.5px] border-b-[1px] border-[#28344F]">*/}
      {/*                <img className="w-8 h-8 rounded-full" src="https://via.placeholder.com/32x32"/>*/}
      {/*                <div className="grow shrink basis-0 flex-col justify-start items-start gap-1 inline-flex">*/}
      {/*                    <div className="justify-center items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-white text-sm font-medium leading-tight">Nevo David</div>*/}
      {/*                        <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wide">05/06/2024</div>*/}
      {/*                    </div>*/}
      {/*                    <div className="self-stretch text-neutral-400 text-xs font-normal">O atual sistema político precisa mudar para valorizar o trabalho e garantir igualdade de oportunidad</div>*/}
      {/*                    <div className="self-stretch justify-start items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-[#E4B895] text-xs font-normal">See Tweet</div>*/}
      {/*                        <div className="w-4 h-4 relative"/>*/}
      {/*                    </div>*/}
      {/*                </div>*/}
      {/*            </div>*/}
      {/*            <div className="self-stretch justify-start items-start gap-2.5 inline-flex pb-[16.5px] border-b-[1px] border-[#28344F]">*/}
      {/*                <img className="w-8 h-8 rounded-full" src="https://via.placeholder.com/32x32"/>*/}
      {/*                <div className="grow shrink basis-0 flex-col justify-start items-start gap-1 inline-flex">*/}
      {/*                    <div className="justify-center items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-white text-sm font-medium leading-tight">Nevo David</div>*/}
      {/*                        <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wide">05/06/2024</div>*/}
      {/*                    </div>*/}
      {/*                    <div className="self-stretch text-neutral-400 text-xs font-normal">O atual sistema político precisa mudar para valorizar o trabalho e garantir igualdade de oportunidad</div>*/}
      {/*                    <div className="self-stretch justify-start items-center gap-1 inline-flex">*/}
      {/*                        <div className="text-[#E4B895] text-xs font-normal">See Tweet</div>*/}
      {/*                        <div className="w-4 h-4 relative"/>*/}
      {/*                    </div>*/}
      {/*                </div>*/}
      {/*            </div>*/}
      {/*        </div>*/}
      {/*    </div>*/}
      {/*</div>*/}
    </div>
  );
};
