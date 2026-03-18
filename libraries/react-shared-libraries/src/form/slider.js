'use client';
import { useCallback } from 'react';
import clsx from 'clsx';
export const Slider = (props) => {
    const { value, onChange, fill } = props;
    const change = useCallback(() => {
        onChange(value === 'on' ? 'off' : 'on');
    }, [value]);
    return (<div className={clsx('w-[57px] h-[34px] p-[4px] border-fifth border rounded-[100px]', value === 'on' && fill && 'bg-customColor4')} onClick={change}>
      <div className="w-full h-full relative rounded-[100px]">
        <div className={clsx('absolute left-0 top-0 w-[24px] h-[24px] bg-customColor5 rounded-full transition-all cursor-pointer', value === 'on' ? 'left-[100%] -translate-x-[100%]' : 'left-0')}/>
      </div>
    </div>);
};
//# sourceMappingURL=slider.js.map