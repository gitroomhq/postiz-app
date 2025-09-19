'use client';

import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const supportEmitter = new EventEmitter();
export const Support = () => {
  const [show, setShow] = useState(true);
  const { discordUrl } = useVariables();
  const t = useT();

  useEffect(() => {
    supportEmitter.on('change', setShow);
    return () => {
      supportEmitter.off('state', setShow);
    };
  }, []);
  if (!discordUrl || !show) return null;
  return (
    <div
      className="bg-customColor39 w-[194px] h-[58px] fixed end-[20px] bottom-[20px] z-[500] text-[16px] text-customColor40 rounded-[30px] !rounded-br-[0] cursor-pointer flex justify-center items-center gap-[10px]"
      onClick={() => window.open(discordUrl)}
    >
      <div>
        <svg
          width="32"
          height="33"
          viewBox="0 0 32 33"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mb-[4px]"
        >
          <path
            d="M26.1303 11.347C24.3138 9.93899 22.134 9.23502 19.8331 9.11768L19.4697 9.4697C21.5284 9.93899 23.345 10.8776 25.0404 12.1683C22.9817 11.1123 20.6807 10.4084 18.2587 10.1737C17.5321 10.0563 16.9266 10.0563 16.2 10.0563C15.4734 10.0563 14.8679 10.0563 14.1413 10.1737C11.7193 10.4084 9.41833 11.1123 7.35963 12.1683C9.05501 10.8776 10.8716 9.93899 12.9303 9.4697L12.5669 9.11768C10.266 9.23502 8.08621 9.93899 6.26972 11.347C4.21101 15.1017 3.1211 19.3257 3 23.6669C4.81649 25.5443 7.35963 26.7177 10.0239 26.7177C10.0239 26.7177 10.8716 25.779 11.477 24.9576C9.90277 24.6057 8.44954 23.7843 7.48074 22.4937C8.32843 22.963 9.17611 23.4323 10.0239 23.7843C11.1138 24.2537 12.2037 24.4883 13.2936 24.723C14.2624 24.8403 15.2312 24.9576 16.2 24.9576C17.1688 24.9576 18.1376 24.8403 19.1064 24.723C20.1963 24.4883 21.2862 24.2537 22.3761 23.7843C23.2239 23.4323 24.0716 22.963 24.9193 22.4937C23.9505 23.7843 22.4972 24.6057 20.923 24.9576C21.5284 25.779 22.3761 26.7177 22.3761 26.7177C25.0404 26.7177 27.5835 25.5443 29.4 23.6669C29.2789 19.3257 28.189 15.1017 26.1303 11.347ZM12.2037 21.555C10.9927 21.555 9.90278 20.499 9.90278 19.2084C9.90278 17.9177 10.9927 16.8617 12.2037 16.8617C13.4147 16.8617 14.5046 17.9177 14.5046 19.2084C14.5046 20.499 13.4147 21.555 12.2037 21.555ZM20.1963 21.555C18.9853 21.555 17.8954 20.499 17.8954 19.2084C17.8954 17.9177 18.9853 16.8617 20.1963 16.8617C21.4073 16.8617 22.4972 17.9177 22.4972 19.2084C22.4972 20.499 21.4073 21.555 20.1963 21.555Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div>{t('discord_support', 'Discord Support')}</div>
    </div>
  );
};
