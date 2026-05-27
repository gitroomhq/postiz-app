import { FC } from 'react';
import SafeImage from '@gitroom/react/helpers/safe.image';

export const Testimonial: FC<{
  picture: string;
  name: string;
  description: string;
  content: any;
}> = ({ content, description, name, picture }) => {
  return (
    <div className="w-full flex flex-col gap-4 p-6 glass rounded-2xl">
      {/* Header */}
      <div className="flex gap-3 min-w-0">
        <div className="size-9 rounded-full overflow-hidden shrink-0 border border-borderGlass">
          <SafeImage src={picture} alt={name} width={36} height={36} />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="text-body-sm font-semibold text-fg truncate leading-[1.2]">
            {name}
          </div>
          <div className="text-caption text-fgMuted">{description}</div>
        </div>
      </div>

      {/* Content */}
      <div className="text-body-sm text-fg whitespace-pre-line w-full min-w-0">
        {typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}
      </div>
    </div>
  );
};
