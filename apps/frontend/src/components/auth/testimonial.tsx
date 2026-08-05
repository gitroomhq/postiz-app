import { FC } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';

export const Testimonial: FC<{
  picture: string;
  name: string;
  description: string;
  content: any;
}> = ({ content, description, name, picture }) => {
  return (
    <div className="rounded-[16px] w-full flex flex-col gap-[16px] p-[20px] bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
      {/* Header */}
      <div className="flex gap-[12px] min-w-0">
        <div className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0">
          <SafeImage src={picture} alt={name} width={36} height={36} />
        </div>

        <div className="flex flex-col -mt-[4px] min-w-0">
          <div className="text-[16px] font-[700] truncate">{name}</div>
          <div className="text-[11px] font-[400] text-pqMuted">
            {description}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="text-[12px] font-[400] text-pqText whitespace-pre-line w-full min-w-0">
        {typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}
      </div>
    </div>
  );
};
