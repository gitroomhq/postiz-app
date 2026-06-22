'use client';

import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { slideFileName, type Carousel } from '@gitroom/carousel-engine';

/**
 * Ponte Volatis → motor de publicação do Postiz. Em vez de cada ferramenta virar
 * uma ilha, o gerador exporta os slides, sobe na mídia (`/media/upload-simple`,
 * mesmo endpoint do Polotno) e abre o compositor de post (`AddEditModal`) já com
 * as imagens anexadas e os canais do cliente ativo pré-selecionados.
 */

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

interface UploadedMedia {
  id: string;
  path: string;
}

export function useCarouselPublish(captureAll: () => string[], doc: Carousel) {
  const modal = useModals();
  const fetch = useFetch();
  const toaster = useToaster();
  const [publishing, setPublishing] = useState(false);

  const publish = useCallback(
    async (mode: 'now' | 'schedule') => {
      const dataUrls = captureAll();
      if (!dataUrls.length || publishing) return;
      setPublishing(true);
      try {
        // 1. canais do cliente ativo (per-client channels da Fase 3) — checa antes de subir
        const listUrl = doc.crmClientId
          ? `/integrations/list?clientId=${doc.crmClientId}`
          : '/integrations/list';
        const integrations = (await (await fetch(listUrl)).json()).integrations ?? [];
        if (!integrations.length) {
          toaster.show(
            doc.crmClientId
              ? 'Este cliente ainda não tem canais atribuídos. Atribua um canal no cockpit Volatis antes de publicar.'
              : 'Nenhum canal conectado. Conecte um canal em Integrações antes de publicar.',
            'warning'
          );
          return;
        }

        // 2. sobe cada slide como mídia do Postiz
        const slug = (doc.title || 'carrossel').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const images: UploadedMedia[] = [];
        for (let i = 0; i < dataUrls.length; i++) {
          const formData = new FormData();
          formData.append('file', dataUrlToBlob(dataUrls[i]), `${slug}-${slideFileName(i)}`);
          const data = await (
            await fetch('/media/upload-simple', { method: 'POST', body: formData })
          ).json();
          images.push({ id: data.id, path: data.path });
        }

        // 3. data sugerida: próximo slot livre p/ agendar, agora p/ postar
        const date =
          mode === 'schedule'
            ? dayjs.utc((await (await fetch('/posts/find-slot')).json()).date).local()
            : dayjs().add(2, 'minute');

        // 4. abre o compositor do Postiz já preenchido
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
              selectedChannels={integrations.map((i: { id: string }) => i.id)}
              onlyValues={[{ content: '', image: images }]}
              date={date}
              mutate={() => {}}
              reopenModal={() => {}}
            />
          ),
          size: '80%',
          title: '',
        });
      } finally {
        setPublishing(false);
      }
    },
    [captureAll, doc.title, doc.crmClientId, modal, fetch, toaster, publishing]
  );

  return { publish, publishing };
}
