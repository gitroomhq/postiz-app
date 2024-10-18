import { FC, ReactNode } from 'react';

import { ReactComponent as ExpandSvg } from '@gitroom/frontend/assets/expand.svg';
import { ReactComponent as CollapseSvg } from '@gitroom/frontend/assets/collapse.svg';

export const TopTitle: FC<{
  title: string;
  shouldExpend?: boolean;
  expend?: () => void;
  collapse?: () => void;
  children?: ReactNode;
}> = (props) => {
  const { title, children, shouldExpend, expend, collapse } = props;

  return (
    <div className="h-[57px] border-b flex items-center border-customColor6 px-[16px] -mx-[16px]">
      <div className="flex-1">{title}</div>
      {children}
      {shouldExpend !== undefined && (
        <div className="cursor-pointer">
          {!shouldExpend ? (
            <ExpandSvg onClick={expend} />
          ) : (
            <CollapseSvg onClick={collapse} />
          )}
        </div>
      )}
    </div>
  );
};
