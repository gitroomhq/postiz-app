'use client';

import { EventEmitter } from 'events';
import { useEffect, useState } from 'react';

export const supportEmitter = new EventEmitter();

export const Support = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    supportEmitter.on('change', setShow);
    return () => {
      supportEmitter.off('state', setShow);
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_DISCORD_SUPPORT || !show) return null
  return (
    <div className="bg-[#612AD5] fixed right-[15px] bottom-[15px] z-[500] p-[20px] text-white rounded-[20px] cursor-pointer" onClick={() => window.open(process.env.NEXT_PUBLIC_DISCORD_SUPPORT)}>Discord Support</div>
  )
}