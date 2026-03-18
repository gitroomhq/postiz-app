import { useT } from "../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import clsx from 'clsx';
import { ExpandIcon, CollapseIcon } from "../../ui/icons";
export const TopTitle = (props) => {
    const { title, removeTitle, children, shouldExpend, expend, collapse } = props;
    const t = useT();
    // Translate the title using a key derived from the title itself
    // This creates a consistent key pattern for each title
    const translatedTitle = t(
    // Convert to lowercase, replace spaces with underscores
    `top_title_${title
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w]/g, '')}`, title);
    return (<div className={clsx('border-b flex items-center border-newBgLineColor -mx-[24px]', props.extraClass ? props.extraClass : 'h-[57px]')}>
      <div className="px-[24px] flex flex-1 items-center">
        {!removeTitle && (<div className={clsx('flex-1', props.titleSize)}>
            {translatedTitle}
          </div>)}
        {children}
        {shouldExpend !== undefined && (<div className="cursor-pointer">
            {!shouldExpend ? (<ExpandIcon onClick={expend} className="text-white"/>) : (<CollapseIcon onClick={collapse} className="text-white"/>)}
          </div>)}
      </div>
    </div>);
};
//# sourceMappingURL=top.title.component.js.map