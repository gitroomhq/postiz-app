'use client';

import { FC, ReactNode, useEffect } from 'react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettingsTabChrome } from '@gitroom/frontend/components/settings/settings-tab-chrome.context';

/**
 * In-pane Settings editor (owner override over stacked openModal forms).
 * List stays in the same settings card; Save/Cancel returns to the list.
 */
export const SettingsPaneEditor: FC<{
  title: string;
  onBack: () => void;
  children: ReactNode;
}> = ({ title, onBack, children }) => {
  const t = useT();
  const { setInEditor } = useSettingsTabChrome();

  useEffect(() => {
    setInEditor(true);
    return () => setInEditor(false);
  }, [setInEditor]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[16px]" data-settings-pane="edit">
      {/* Channels-style boxed back — muted pill, not a faint text link. */}
      <button
        type="button"
        onClick={onBack}
        className="flex h-[32px] w-fit items-center gap-[6px] self-start rounded-[9px] bg-pqSettings pe-[12px] ps-[8px] text-[12.5px] font-[600] text-pqText transition-colors hover:bg-pqHover"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          aria-hidden="true"
          className="rtl:rotate-180"
        >
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t('back', 'Back')}
      </button>
      <h3 className="text-[20px] font-[500] tracking-[-0.01em] text-pqText">
        {title}
      </h3>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
};
