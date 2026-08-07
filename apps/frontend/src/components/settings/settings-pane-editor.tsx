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
  /** Optional one-line context under the title (Add Member, Signature, …). */
  description?: string;
  onBack: () => void;
  children: ReactNode;
}> = ({ title, description, onBack, children }) => {
  const t = useT();
  const { setInEditor } = useSettingsTabChrome();

  useEffect(() => {
    setInEditor(true);
    return () => setInEditor(false);
  }, [setInEditor]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-[14px]"
      data-settings-pane="edit"
    >
      {/* Channels-style boxed back — muted pill, not a faint text link. */}
      <button
        type="button"
        onClick={onBack}
        className="flex h-[28px] w-fit items-center gap-[5px] self-start rounded-[8px] bg-pqSettings pe-[10px] ps-[7px] text-[12px] font-[600] text-pqText transition-colors hover:bg-pqHover"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
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
      <div className="flex flex-col gap-[4px]">
        <h3 className="text-[20px] font-[600] tracking-[-0.02em] text-pqText">
          {title}
        </h3>
        {!!description && (
          <p className="max-w-[420px] text-[14.5px] leading-[1.45] text-pqText">
            {description}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
};
