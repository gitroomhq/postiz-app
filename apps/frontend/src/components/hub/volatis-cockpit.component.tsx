'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { VolatisClientProvider } from '@gitroom/frontend/components/hub/volatis-client-context';
import { VolatisClientSelector } from '@gitroom/frontend/components/hub/volatis-client-selector.component';
import { VolatisChannelManager } from '@gitroom/frontend/components/hub/volatis-channel-manager.component';
import { VolatisCarouselLaunch } from '@gitroom/frontend/components/hub/volatis-carousel-launch.component';
import { VolatisCreatePost } from '@gitroom/frontend/components/hub/volatis-create-post.component';
import { LaunchesComponent } from '@gitroom/frontend/components/launches/launches.component';
import { useElementSize } from '@gitroom/frontend/components/volatis/carousel/use-element-size.hook';

const BAR_HEIGHT = 52;

export const VolatisCockpit = () => {
  // O LaunchesComponent (calendário Postiz) espera ser esticado a uma altura
  // definida — no /launches ele é filho direto da linha horizontal do host. Ao
  // envolvê-lo num flex-col com a barra de contexto, a altura `flex-1` colapsava
  // (painel de canais `absolute` flutuava sobre a faixa de datas). Damos altura
  // explícita = área visível − barra, como no editor de carrossel.
  const root = useElementSize<HTMLDivElement>();
  const calendarHeight = Math.max(360, root.availableHeight - BAR_HEIGHT);

  return (
    <VolatisClientProvider>
      <div ref={root.ref} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center gap-[12px] px-[20px] h-[52px] shrink-0 bg-newBgColorInner border-b border-newBorder">
          <span className="text-[11px] font-[700] uppercase tracking-[0.1em] text-textItemBlur">
            Contexto
          </span>
          <VolatisClientSelector />
          <div className="ml-auto flex items-center gap-[10px]">
            <VolatisCreatePost />
            <Link
              href="/hub/volatis"
              className="flex items-center gap-[6px] px-[12px] h-[36px] rounded-[10px] text-[12px] font-[600] border border-newBorder transition-colors text-white"
              style={{ background: 'var(--voc-rose)', borderColor: 'transparent' }}
            >
              <CalendarDays size={13} />
              Calendário
            </Link>
            <VolatisCarouselLaunch />
            <VolatisChannelManager />
          </div>
        </div>
        <div className="flex min-h-0" style={{ height: calendarHeight }}>
          <LaunchesComponent />
        </div>
      </div>
    </VolatisClientProvider>
  );
};
