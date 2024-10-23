import { FC } from 'react';
import { StarsAndForksInterface } from '@gitroom/frontend/components/analytics/stars.and.forks.interface';
import { Chart } from '@gitroom/frontend/components/analytics/chart';
import { UtcToLocalDateRender } from '@gitroom/react/helpers/utc.date.render';
import clsx from 'clsx';

import { ReactComponent as StarSvg } from '@gitroom/frontend/assets/star.svg';
import { ReactComponent as MultiplySvg } from '@gitroom/frontend/assets/multiply.svg';
import { ReactComponent as GraphUpSvg } from '@gitroom/frontend/assets/graph-up.svg';
import { ReactComponent as ChartUpSvg } from '@gitroom/frontend/assets/chart-up.svg';

export const StarsAndForks: FC<StarsAndForksInterface> = (props) => {
  const { list } = props;
  return (
    <>
      {list.map((item) => (
        <div className="flex gap-[24px] h-[272px]" key={item.login}>
          <div className="flex-1 bg-secondary py-[10px] px-[16px] flex flex-col">
            <div className="flex items-center gap-[14px]">
              <div className="bg-fifth p-[8px]">
                <StarSvg />
              </div>
              <div className="text-[20px]">
                {item.login
                  .split('/')[1]
                  .split('')
                  .map((char, index) =>
                    index === 0 ? char.toUpperCase() : char
                  )
                  .join('')}{' '}
                Stars
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute w-full h-full left-0 top-0">
                {item.stars.length ? (
                  <Chart list={item.stars} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    Processing stars...
                  </div>
                )}
              </div>
            </div>
            <div className="text-[50px] leading-[60px]">
              {item?.stars[item.stars.length - 1]?.totalStars}
            </div>
          </div>

          <div className="flex-1 bg-secondary py-[10px] px-[16px] flex flex-col">
            <div className="flex items-center gap-[14px]">
              <div className="bg-fifth p-[8px]">
                <MultiplySvg />
              </div>
              <div className="text-[20px]">
                {item.login
                  .split('/')[1]
                  .split('')
                  .map((char, index) =>
                    index === 0 ? char.toUpperCase() : char
                  )
                  .join('')}{' '}
                Forks
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute w-full h-full left-0 top-0">
                {item.forks.length ? (
                  <Chart list={item.forks} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    Processing stars...
                  </div>
                )}
              </div>
            </div>
            <div className="text-[50px] leading-[60px]">
              {item?.forks[item.forks.length - 1]?.totalForks}
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-[24px]">
        {[0, 1].map((p) => (
          <div
            key={p}
            className="flex-1 bg-secondary py-[24px] px-[16px] gap-[16px] flex flex-col"
          >
            <div className="flex items-center gap-[14px]">
              <div className="p-[8px] bg-fifth">
                {p === 0 ? <GraphUpSvg /> : <ChartUpSvg />}
              </div>
              <div className="text-[20px]">
                {p === 0
                  ? 'Last Github Trending'
                  : 'Next Predicted GitHub Trending'}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-[2px] h-[30px] bg-customColor11 mr-[16px]"></div>
              <div className="text-[24px] flex-1">
                <UtcToLocalDateRender
                  date={
                    p === 0 ? props.trending.last : props.trending.predictions
                  }
                  format="dddd"
                />
              </div>
              <div
                className={clsx(
                  'text-[24px]',
                  p === 0 ? 'text-customColor12' : 'text-customColor13'
                )}
              >
                <UtcToLocalDateRender
                  date={
                    p === 0 ? props.trending.last : props.trending.predictions
                  }
                  format="DD MMM YYYY"
                />
              </div>
              <div>
                <div className="rounded-full bg-customColor14 w-[5px] h-[5px] mx-[8px]" />
              </div>
              <div
                className={clsx(
                  'text-[24px]',
                  p === 0 ? 'text-customColor12' : 'text-customColor13'
                )}
              >
                <UtcToLocalDateRender
                  date={
                    p === 0 ? props.trending.last : props.trending.predictions
                  }
                  format="HH:mm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
