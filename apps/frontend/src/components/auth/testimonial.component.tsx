'use client';

import {
  testimonials1,
  testimonials2,
} from '@gitroom/react/helpers/testomonials';
import { Testimonial } from '@gitroom/frontend/components/auth/testimonial';

export const TestimonialComponent = () => {
  return (
    <div className="flex-1 relative w-full my-[30px] max-w-[850px]">
      <div className="absolute w-full h-full left-0 top-0 px-[40px] overflow-hidden">
        <div className="absolute w-full h-[120px] left-0 top-0 blackGradTopBg z-[100]" />
        <div className="absolute w-full h-[120px] left-0 bottom-0 blackGradBottomBg z-[100]" />
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
