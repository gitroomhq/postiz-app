'use client';

import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVolatisClient } from '@gitroom/frontend/components/hub/volatis-client-context';

/**
 * "Criar Post" do cockpit Volatis — abre o compositor do Postiz (`AddEditModal`)
 * por fora do calendário (o `NewPost` nativo depende do `useCalendar`, que só
 * existe dentro do `LaunchesComponent`). Pré-seleciona os canais do cliente ativo
 * (per-client channels da Fase 3) quando há um cliente escolhido.
 */
export const VolatisCreatePost = () => {
  const modal = useModals();
  const fetch = useFetch();
  const toaster = useToaster();
  const { selectedClientId } = useVolatisClient();
  const [loading, setLoading] = useState(false);

  const createPost = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const listUrl = selectedClientId
        ? `/integrations/list?clientId=${selectedClientId}`
        : '/integrations/list';
      const integrations = (await (await fetch(listUrl)).json()).integrations ?? [];
      if (!integrations.length) {
        toaster.show(
          selectedClientId
            ? 'Este cliente ainda não tem canais atribuídos. Atribua um canal em "Canais" antes de criar um post.'
            : 'Nenhum canal conectado. Conecte um canal antes de criar um post.',
          'warning'
        );
        return;
      }
      const date = dayjs
        .utc((await (await fetch('/posts/find-slot')).json()).date)
        .local();
      // import dinâmico: o compositor é pesado e não deve entrar no bundle do cockpit
      const { AddEditModal } = await import(
        '@gitroom/frontend/components/new-launch/add.edit.modal'
      );
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
        children: (
          <AddEditModal
            allIntegrations={integrations}
            integrations={integrations}
            selectedChannels={
              selectedClientId ? integrations.map((i: { id: string }) => i.id) : []
            }
            date={date}
            mutate={() => {}}
            reopenModal={() => {}}
          />
        ),
        size: '80%',
        title: '',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, selectedClientId, fetch, toaster, modal]);

  return (
    <button
      type="button"
      onClick={createPost}
      disabled={loading}
      className="flex items-center gap-[6px] text-[12px] font-[800] px-[14px] py-[7px] rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 20px rgba(207,98,149,0.28)' }}
    >
      <Plus size={14} />
      Criar Post
    </button>
  );
};
