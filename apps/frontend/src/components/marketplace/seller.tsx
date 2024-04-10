'use client';

import { Slider } from "@gitroom/react/form/slider";
import { Button } from '@gitroom/react/form/button';

export const Seller = () => {
  return (
    <div className="flex mt-[29px] w-full gap-[26px]">
      <div className="w-[328px] flex flex-col gap-[16px]">
        <h2 className="text-[20px]">Seller Mode</h2>
        <div className="flex p-[24px] bg-sixth rounded-[4px] border border-[#172034] flex-col items-center gap-[16px]">
          <div className="w-[64px] h-[64px] bg-[#D9D9D9] rounded-full" />
          <div className="text-[24px]">John Smith</div>
          <div className="flex gap-[16px] items-center pb-[8px]">
            <Slider fill={true} value="on" onChange={() => {}} />
            <div className="text-[18px]">Active</div>
          </div>
          <div className="border-t border-t-[#425379] w-full" />
          <div className="w-full">
            <Button className="w-full">Connect Bank Account</Button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex gap-[16px] flex-col">
        <h2 className="text-[20px]">Details</h2>
        <div className="bg-sixth p-[24px] rounded-[4px] border border-[#172034]">
          asdfasdf
        </div>
      </div>
    </div>
  );
};
