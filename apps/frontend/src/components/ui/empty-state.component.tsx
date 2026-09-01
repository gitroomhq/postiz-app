import { FC, ReactNode } from 'react';
import clsx from 'clsx';

export const EmptyState: FC<{
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div
    className={clsx(
      'flex flex-col items-center text-center gap-[20px]',
      className
    )}
  >
    <div>{icon}</div>
    <div className="flex flex-col gap-[8px] items-center">
      <div className="text-[20px] font-[600]">{title}</div>
      {!!description && (
        <div className="text-[14px] text-customColor18 whitespace-pre-line max-w-[420px]">
          {description}
        </div>
      )}
    </div>
    {!!action && <div className="flex gap-[8px] items-center">{action}</div>}
  </div>
);
