'use client';

import { FC, useCallback } from 'react';
import { useUser } from '../layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { DeveloperComponent } from '@gitroom/frontend/components/developer/developer.component';
import { ApiKeyCard } from '@gitroom/frontend/components/public-api/api-key-card';
import { useRouter } from 'next/navigation';
import { leaveSettingsFor } from '@gitroom/frontend/components/layout/leave-settings';

/**
 * Public API key reveal + optional “Connect an AI agent” CTA.
 * Access|Apps tabs were removed — Settings/Connect use separate nav rows.
 */
export const PublicApiKeysSection: FC<{
  /** Hide the "Open Connections" CTA when already inside the Connect panel. */
  embeddedInConnect?: boolean;
}> = ({ embeddedInConnect }) => {
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
    <div className="mt-[18px] flex flex-col gap-[10px]">
      <ApiKeyCard compact showDocs={false} showWizard={false} />

      {!embeddedInConnect && (
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
            className="flex h-[32px] shrink-0 items-center rounded-pqSm bg-pqBrand px-[12px] text-[12.5px] font-[600] text-pqOnBrand transition-[filter] hover:brightness-110"
          >
            {t('open_connections', 'Open Connections')}
          </button>
        </div>
      )}
    </div>
  );
};

/** OAuth apps (former Developers → Apps tab). */
export const PublicAppsSection: FC = () => (
  <div className="mt-[18px]">
    <DeveloperComponent />
  </div>
);

/**
 * @deprecated Prefer PublicApiKeysSection / PublicAppsSection — nav split.
 * Kept as API-keys alias so older imports keep working.
 */
export const PublicComponent: FC<{
  onClose?: () => void;
  embeddedInConnect?: boolean;
}> = ({ embeddedInConnect }) => (
  <PublicApiKeysSection embeddedInConnect={embeddedInConnect} />
);
