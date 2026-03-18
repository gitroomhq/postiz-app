import { useCallback } from 'react';
import clsx from 'clsx';
import { ChevronUpIcon } from "../ui/icons";
const Arrow = (props) => {
    const { flip } = props;
    return (<ChevronUpIcon style={{
            transform: !flip ? 'rotate(180deg)' : '',
        }}/>);
};
export const UpDownArrow = (props) => {
    const { isUp, isDown, onChange } = props;
    const changePosition = useCallback((type) => () => {
        onChange(type);
    }, []);
    return (<div className="flex flex-col gap-[8px] pt-[8px]">
      <button onClick={changePosition('up')} className={clsx('outline-none w-[20px] h-[20px] flex justify-center items-center', isUp
            ? 'cursor-pointer'
            : 'pointer-events-none text-textColor opacity-50')}>
        <Arrow flip={true}/>
      </button>
      <button onClick={changePosition('down')} className={clsx('outline-none rounded-bl-[20px] w-[20px] h-[20px] flex justify-center items-center', isDown
            ? 'cursor-pointer'
            : 'pointer-events-none text-textColor opacity-50')}>
        <Arrow flip={false}/>
      </button>
    </div>);
};
//# sourceMappingURL=up.down.arrow.js.map