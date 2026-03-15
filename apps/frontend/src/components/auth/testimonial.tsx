import { FC } from 'react';
import Image from 'next/image';

export const Testimonial: FC<{
  picture: string;
  name: string;
  description: string;
  content: any;
}> = ({ content, description, name, picture }) => {
  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.52),rgba(15,23,42,0.76))] p-[20px] shadow-[0_20px_40px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="flex gap-[12px] min-w-0">
        <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-full border border-white/12 ring-2 ring-white/6">
          <Image src={picture} alt={name} width={36} height={36} />
        </div>

        <div className="flex flex-col -mt-[4px] min-w-0">
          <div className="truncate text-[16px] font-[700] text-white/92">
            {name}
          </div>
          <div className="text-[11px] font-[500] uppercase tracking-[0.08em] text-slate-300/64">
            {description}
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-white/8" />
      <div className="w-full min-w-0 whitespace-pre-line text-[12px] leading-[1.65] font-[400] text-white/82">
        {typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}
      </div>
    </div>
  );
};
