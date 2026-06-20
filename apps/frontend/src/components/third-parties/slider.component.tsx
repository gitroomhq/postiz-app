import { FC, ReactNode, useCallback, useState } from 'react';
import clsx from 'clsx';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@gitroom/frontend/components/ui/icons';

export const SliderComponent: FC<{
  className: string;
  list: ReactNode[];
}> = ({ className, list }) => {
  const [show, setShow] = useState(0);

  const goToPrevious = useCallback(() => {
    setShow((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToNext = useCallback(() => {
    setShow((prev) => (prev < list.length - 1 ? prev + 1 : prev));
  }, [list.length]);

  const canGoPrevious = show > 0;
  const canGoNext = show < list.length - 1;

  return (
    <div className={clsx(className, 'relative')}>
      {list[show]}

      {/* Left Arrow */}
      {canGoPrevious && (
        <button
          onClick={goToPrevious}
          className="absolute top-[50%] start-[10px] -translate-y-[50%] flex items-center justify-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeftIcon size={18} />
        </button>
      )}

      {/* Right Arrow */}
      {canGoNext && (
        <button
          onClick={goToNext}
          className="absolute top-[50%] end-[10px] -translate-y-[50%] flex items-center justify-center w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRightIcon size={18} />
        </button>
      )}

      {/* Pagination Dots */}
      {list.length > 1 && (
        <div className="absolute bottom-[10px] left-[50%] -translate-x-[50%] flex gap-2">
          {list.map((_, index) => (
            <button
              key={index}
              onClick={() => setShow(index)}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors cursor-pointer',
                index === show
                  ? 'bg-white'
                  : 'bg-transparent border border-white'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
