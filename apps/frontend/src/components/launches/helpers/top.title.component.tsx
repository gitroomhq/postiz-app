import { FC, ReactNode } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { ExpandIcon, CollapseIcon } from '@gitroom/frontend/components/ui/icons';

export const TopTitle: FC<{
  title: string;
  shouldExpend?: boolean;
  removeTitle?: boolean;
  extraClass?: string;
  expend?: () => void;
  collapse?: () => void;
  children?: ReactNode;
  titleSize?: string;
}> = (props) => {
  const { title, removeTitle, children, shouldExpend, expend, collapse } =
    props;
  const t = useT();

  // Translate the title using a key derived from the title itself
  // This creates a consistent key pattern for each title
  const translatedTitle = t(
    // Convert to lowercase, replace spaces with underscores
    `top_title_${title
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '')}`,
    title
  );

  return (
    <div
      className={clsx(
        'border-b flex items-center border-pqLine -mx-[24px]',
        props.extraClass ? props.extraClass : 'h-[57px]'
      )}
    >
      <div className="px-[24px] flex flex-1 items-center">
        {!removeTitle && (
          <div className={clsx('flex-1', props.titleSize)}>
            {translatedTitle}
          </div>
        )}
        {children}
        {shouldExpend !== undefined && (
          <div className="cursor-pointer">
            {!shouldExpend ? (
              <ExpandIcon onClick={expend} className="text-pqText" />
            ) : (
              <CollapseIcon onClick={collapse} className="text-pqText" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
