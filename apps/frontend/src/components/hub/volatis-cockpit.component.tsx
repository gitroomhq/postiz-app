'use client';

import { VolatisClientProvider } from '@gitroom/frontend/components/hub/volatis-client-context';
import { VolatisClientSelector } from '@gitroom/frontend/components/hub/volatis-client-selector.component';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';

export const VolatisCockpit = () => {
  return (
    <VolatisClientProvider>
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className="flex items-center gap-[12px] px-[20px] h-[52px] shrink-0"
          style={{
            borderBottom: '1px solid var(--voc-line)',
            background: 'var(--voc-paper)',
          }}
        >
          <span
            className="text-[11px] font-[700] uppercase tracking-[0.1em]"
            style={{ color: 'var(--voc-ink-soft)' }}
          >
            Contexto
          </span>
          <VolatisClientSelector />
        </div>
        <div className="flex-1 min-h-0">
          <LaunchesComponent />
        </div>
      </div>
    </VolatisClientProvider>
  );
};
