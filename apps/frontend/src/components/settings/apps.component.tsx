'use client';

import { FC, useState } from 'react';
import clsx from 'clsx';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import { ApprovedAppsComponent } from '@gitroom/frontend/components/approved-apps/approved-apps.component';

export const AppsComponent: FC<{ canManageApps: boolean }> = ({
  canManageApps,
}) => {
  const t = useT();
  const [subTab, setSubTab] = useState<'apps' | 'approved_apps'>('apps');
  const current = canManageApps ? subTab : 'approved_apps';

  return (
    <div className="flex flex-col gap-[20px]">
      <h3 className="text-[20px]">{t('apps', 'Apps')}</h3>
      {canManageApps && (
        <div className="flex gap-[6px]">
          {(['apps', 'approved_apps'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={clsx(
                'cursor-pointer px-[20px] h-[44px] text-[15px] font-[600] rounded-[8px] transition-colors',
                current === tab
                  ? 'bg-[#612BD3] text-white'
                  : 'bg-btnSimple text-customColor18 hover:bg-boxHover hover:text-textColor'
              )}
              onClick={() => setSubTab(tab)}
            >
              {tab === 'apps'
                ? t('apps', 'Apps')
                : t('approved_apps', 'Approved Apps')}
            </button>
          ))}
        </div>
      )}
      {current === 'apps' && <DeveloperComponent />}
      {current === 'approved_apps' && <ApprovedAppsComponent />}
    </div>
  );
};
