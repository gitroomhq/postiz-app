'use client';

import { FC, useCallback, useState } from 'react';
import { useUser } from '../layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import { ApiKeyCard } from '@gitroom/frontend/components/public-api/api-key-card';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { leaveSettingsFor } from '@gitroom/frontend/components/layout/leave-settings';

const PublicApiContent: FC<{ onClose?: () => void }> = () => {
  const user = useUser();
  const t = useT();
  const router = useRouter();

  const goConnections = useCallback(() => {
    leaveSettingsFor('/connections', router);
  }, [router]);

  if (!user || !user.publicApi) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <ApiKeyCard compact showDocs={false} showWizard={false} />

      <div className="flex items-center gap-[12px] rounded-pqMd bg-pqPop p-[15px_16px] shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-[600]">
            {t('connect_an_ai_agent', 'Connect an AI agent')}
          </div>
          <div className="mt-[3px] text-[12.5px] text-pqMuted">
            {t(
              'connect_an_ai_agent_sub',
              'Claude, ChatGPT, MCP clients, n8n and the CLI all live under Connections.'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={goConnections}
          className="flex h-[32px] shrink-0 items-center rounded-pqSm bg-pqBrand px-[12px] text-[12.5px] font-[600] text-white transition-[filter] hover:brightness-110"
        >
          {t('open_connections', 'Open Connections')}
        </button>
      </div>
    </div>
  );
};

export const PublicComponent: FC<{ onClose?: () => void }> = () => {
  const t = useT();
  const [subTab, setSubTab] = useState<'api' | 'developer'>('api');

  return (
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <div className="flex gap-[6px]">
        {(['api', 'developer'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={clsx(
              'flex h-[32px] cursor-pointer items-center rounded-pqSm px-[13px] text-[12.5px] transition-colors',
              subTab === tab
                ? 'bg-pqBrandSoft font-[600] text-pqText shadow-[inset_0_0_0_1px_var(--brand)]'
                : 'text-pqMuted shadow-[inset_0_0_0_1px_var(--border)] hover:bg-pqHover'
            )}
            onClick={() => setSubTab(tab)}
          >
            {tab === 'api'
              ? t('access', 'Access')
              : t('apps', 'Apps')}
          </button>
        ))}
      </div>
      {subTab === 'api' && <PublicApiContent />}
      {subTab === 'developer' && <DeveloperComponent />}
    </div>
  );
};
