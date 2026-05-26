import { FC } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';

export const Testimonial: FC<{
  picture: string;
  name: string;
  description: string;
  content: any;
}> = ({ content, description, name, picture }) => {
  return (
    <div className="w-full flex flex-col gap-[16px] p-[20px] bg-lamboIron">
      {/* Header */}
      <div className="flex gap-[12px] min-w-0">
        <div className="w-[36px] h-[36px] overflow-hidden shrink-0">
          <SafeImage src={picture} alt={name} width={36} height={36} />
        </div>

        <div className="flex flex-col -mt-[4px] min-w-0">
          <div className="text-[14px] font-lambo uppercase text-white truncate leading-[1.2]">{name}</div>
          <div className="lambo-micro text-lamboAsh">
            {description}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-[14px] text-white whitespace-pre-line w-full min-w-0 leading-[1.5]">
        {typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}
      </div>
    </div>
  );
};
