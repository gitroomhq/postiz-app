import { FC } from 'react';
import Image from 'next/image';

export const Testimonial: FC<{
  picture: string;
  name: string;
  description: string;
  content: any;
}> = ({ content, description, name, picture }) => {
  return (
    <div className="rounded-[16px] w-full flex flex-col gap-[16px] p-[20px] bg-[#1A1919] border border-[#2b2a2a]">
      {/* Header */}
      <div className="flex gap-[12px] min-w-0">
        <div className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0">
          <Image src={picture} alt={name} width={36} height={36} />
        </div>

        <div className="flex flex-col -mt-[4px] min-w-0">
          <div className="text-[16px] font-[700] truncate">{name}</div>
          <div className="text-[11px] font-[400] text-[#D1D1D1]">
            {description}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-[12px] font-[400] text-[#FFF] whitespace-pre-line w-full min-w-0">
        {typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}
      </div>
    </div>
  );
};
