'use client';

import ReactLoading from 'react-loading';
import { FC } from 'react';
export const LoadingComponent: FC<{
  width?: number;
  height?: number;
}> = (props) => {
  return (
    <div className="flex-1 flex justify-center pt-[100px]">
      <ReactLoading
        type="spin"
        color="#612bd3"
        width={props.width || 100}
        height={props.height || 100}
      />
    </div>
  );
};
