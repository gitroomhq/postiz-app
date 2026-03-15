'use client';

import {
  testimonials1,
  testimonials2,
} from '@gitroom/react/helpers/testomonials';
import { Testimonial } from '@gitroom/frontend/components/auth/testimonial';

export const TestimonialComponent = () => {
  return (
    <div className="relative my-[30px] flex-1 w-full max-w-[900px]">
      <div className="absolute left-0 top-0 h-full w-full overflow-hidden px-[24px] xl:px-[40px]">
        <div className="pointer-events-none absolute left-0 top-0 z-[100] h-[140px] w-full bg-[linear-gradient(180deg,rgba(10,14,26,0.96),rgba(10,14,26,0))]" />
        <div className="pointer-events-none absolute bottom-0 left-0 z-[100] h-[140px] w-full bg-[linear-gradient(0deg,rgba(10,14,26,0.96),rgba(10,14,26,0))]" />
        <div className="flex justify-center gap-[12px]">
          <div className="flex flex-col animate-marqueeUp flex-1 gap-[12px]">
            {[1, 2].flatMap((p) =>
              testimonials1.flatMap((a) => (
                <div
                  key={p + '_' + a.name}
                  className="flex flex-col gap-[12px]"
                >
                  <Testimonial {...a} />
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col animate-marqueeDown flex-1 gap-[12px]">
            {[1, 2].flatMap((p) =>
              testimonials2.flatMap((a) => (
                <div
                  key={p + '_' + a.name}
                  className="flex flex-col gap-[12px]"
                >
                  <Testimonial {...a} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
