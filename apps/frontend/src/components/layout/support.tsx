'use client';

import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

import { ReactComponent as DiscordSvg } from '@gitroom/frontend/assets/discord.svg';

export const supportEmitter = new EventEmitter();

export const Support = () => {
  const [show, setShow] = useState(true);
  const { discordUrl } = useVariables();

  useEffect(() => {
    supportEmitter.on('change', setShow);
    return () => {
      supportEmitter.off('state', setShow);
    };
  }, []);

  if (!discordUrl || !show) return null;
  return (
    <div
      className="bg-customColor39 w-[194px] h-[58px] fixed right-[20px] bottom-[20px] z-[500] text-[16px] text-customColor40 rounded-[30px] !rounded-br-[0] cursor-pointer flex justify-center items-center gap-[10px]"
      onClick={() => window.open(discordUrl)}
    >
      <div>
        <DiscordSvg className="mb-[4px]" />
      </div>
      <div>Discord Support</div>
    </div>
  );
};
