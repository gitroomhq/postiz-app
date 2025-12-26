import React, { FC, Fragment, useMemo } from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import Image from 'next/image';
import { capitalize } from 'lodash';

const Valid: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M6 7.33333L8 9.33333L14.6667 2.66667M10.6667 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.71569 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.07989 2 5.2V10.8C2 11.9201 2 12.4802 2.21799 12.908C2.40973 13.2843 2.71569 13.5903 3.09202 13.782C3.51984 14 4.07989 14 5.2 14H10.8C11.9201 14 12.4802 14 12.908 13.782C13.2843 13.5903 13.5903 13.2843 13.782 12.908C14 12.4802 14 11.9201 14 10.8V8"
        stroke="#00EB75"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Invalid: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <g clip-path="url(#clip0_2482_97670)">
        <path
          d="M8.00049 6.00015V8.66682M8.00049 11.3335H8.00715M7.07737 2.59464L1.59411 12.0657C1.28997 12.591 1.1379 12.8537 1.16038 13.0693C1.17998 13.2573 1.2785 13.4282 1.4314 13.5394C1.60671 13.6668 1.91022 13.6668 2.51723 13.6668H13.4837C14.0908 13.6668 14.3943 13.6668 14.5696 13.5394C14.7225 13.4282 14.821 13.2573 14.8406 13.0693C14.8631 12.8537 14.711 12.591 14.4069 12.0657L8.92361 2.59463C8.62056 2.07119 8.46904 1.80947 8.27135 1.72157C8.09892 1.64489 7.90206 1.64489 7.72962 1.72157C7.53193 1.80947 7.38041 2.07119 7.07737 2.59464Z"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2482_97670">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const InformationComponent: FC<{
  chars: Record<string, number>;
  totalChars: number;
  totalAllowedChars: number;
  isPicture: boolean;
}> = ({ totalChars, totalAllowedChars, chars, isPicture }) => {
  const { isGlobal, selectedIntegrations, internal } = useLaunchStore(
    useShallow((state) => ({
      isGlobal: state.current === 'global',
      selectedIntegrations: state.selectedIntegrations,
      internal: state.internal,
    }))
  );

  const isInternal = useMemo(() => {
    if (!isGlobal) {
      return [];
    }
    return selectedIntegrations.map((p) => {
      const findIt = internal.find(
        (a) => a.integration.id === p.integration.id
      );

      return !!findIt;
    });
  }, [isGlobal, internal, selectedIntegrations]);

  const isValid = useMemo(() => {
    if (!isPicture && !totalChars) {
      return false;
    }

    if (totalChars > totalAllowedChars && !isGlobal) {
      return false;
    }

    if (totalChars <= totalAllowedChars && !isGlobal) {
      return true;
    }

    if (
      selectedIntegrations.some((p, index) => {
        if (isInternal[index]) {
          return false;
        }

        return totalChars > (chars?.[p.integration.id] || 0);
      })
    ) {
      return false;
    }

    return true;
  }, [totalAllowedChars, totalChars, isInternal, isPicture, chars]);

  return (
    <div
      className={clsx(
        'group rounded-[6px] gap-[4px] h-[30px] px-[6px] flex justify-center items-center relative',
        isValid ? 'border border-newColColor' : 'bg-[#FF3F3F]'
      )}
    >
      {isValid ? <Valid /> : <Invalid />}

      {!isGlobal && (
        <div className={clsx("text-[10px] font-[600] flex justify-center items-center", !isValid && 'text-white')}>
          {totalChars}/{totalAllowedChars}
        </div>
      )}
      {((isGlobal && selectedIntegrations.length) || !isValid) && (
        <svg
          className={clsx('group-hover:rotate-180', !isValid && 'text-white')}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M5.4563 6L10.5437 6C10.9494 6 11.1526 6.56798 10.8657 6.90016L8.32201 9.84556C8.14417 10.0515 7.85583 10.0515 7.67799 9.84556L5.13429 6.90016C4.84741 6.56798 5.05059 6 5.4563 6Z"
            fill="currentColor"
          />
        </svg>
      )}
      {((isGlobal && selectedIntegrations.length) || !isValid) && (
        <div
          className={clsx(
            'z-[300] hidden rounded-[12px] bg-newBgColorInner group-hover:flex absolute end-0 bottom-[100%] mb-[5px] p-[12px] flex-col',
            isValid ? 'border border-newColColor' : 'border border-[#FF3F3F]'
          )}
        >
          {!isPicture && !totalChars && (
            <div
              className={clsx(
                'text-sm text-[#FF3F3F] whitespace-nowrap',
                isGlobal && selectedIntegrations.length && 'mb-[12px]'
              )}
            >
              Your post should have at least
              <br />
              one character or one image.
            </div>
          )}
          {isGlobal && (
            <div className="grid grid-cols-[auto_auto_auto] text-[14px] font-[500] gap-[8px] items-center">
              {selectedIntegrations.map((p, index) => (
                <Fragment key={p.integration.id}>
                  <div>
                    <Image
                      src={`/icons/platforms/${p.integration.identifier}.png`}
                      alt={p.integration.name}
                      className="rounded-[4px] w-[16px] h-[16px] min-w-[16px] min-h-[16px]"
                      width={16}
                      height={16}
                    />
                  </div>
                  <div
                    className={clsx(
                      'whitespace-nowrap',
                      isInternal?.[index]
                        ? ''
                        : totalChars > (chars?.[p.integration.id] || 0)
                        ? 'text-[#FF3F3F]'
                        : ''
                    )}
                  >
                    {p.integration.name} (
                    {capitalize(p.integration.identifier.split('-')[0])}):
                  </div>
                  <div
                    className={clsx(
                      'whitespace-nowrap',
                      isInternal?.[index]
                        ? ''
                        : totalChars > (chars?.[p.integration.id] || 0)
                        ? 'text-[#FF3F3F]'
                        : ''
                    )}
                  >
                    {isInternal?.[index]
                      ? 'Internal Edit'
                      : `${totalChars}/${chars?.[p.integration.id] || 0}`}
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
