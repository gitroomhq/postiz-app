'use client';

import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { InputGroup } from '@blueprintjs/core';
import { Clean } from '@blueprintjs/icons';
import { SectionTab } from 'polotno/side-panel';
import { getImageSize } from 'polotno/utils/image';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const GenerateTab = observer(({ store }: any) => {
  const inputRef = React.useRef<any>(null);
  const [image, setImage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const { billingEnabled } = useVariables();
  const fetch = useFetch();
  const toast = useToaster();
  const loadCredits = useCallback(async () => {
    if (!billingEnabled) {
      return {
        credits: 1000,
      };
    }
    return (
      await fetch(`/copilot/credits`, {
        method: 'GET',
      })
    ).json();
  }, []);
  const { data, mutate } = useSWR('copilot-credits', loadCredits);
  const t = useT();

  const handleGenerate = async () => {
    if (data?.credits <= 0) {
      window.open('/billing', '_blank');
      return;
    }
    if (!inputRef.current.value) {
      toast.show(
        t('please_type_prompt', 'Por favor digite um prompt'),
        'warning'
      );
      return;
    }
    setLoading(true);
    setImage(null);
    try {
      const req = await fetch(`/media/generate-image`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: inputRef.current.value,
        }),
      });
      if (!req.ok) {
        // Mesmo padrao de tratamento dos modais novos (ai.image, ai.video):
        // backend ja envia message especifica do provider/resolver no
        // detail.message. So mostramos o que vier; fallback generico
        // se o body nao for parseavel.
        const detail = await req.json().catch(() => ({} as any));
        const backendMessage: string | undefined = Array.isArray(
          detail?.message
        )
          ? detail.message.join(' · ')
          : typeof detail?.message === 'string'
          ? detail.message
          : undefined;

        if (req.status === 412 || req.status === 402) {
          toast.show(
            backendMessage ||
              t(
                'ai_image_not_configured',
                'Configure suas chaves em Settings > AI Provider'
              ),
            'warning'
          );
          return;
        }
        if (req.status === 429) {
          toast.show(
            t(
              'ai_image_rate_limit',
              'Você atingiu o limite. Aguarde um instante.'
            ),
            'warning'
          );
          return;
        }
        toast.show(
          backendMessage ||
            t('ai_image_generic_error', 'Erro ao gerar imagem'),
          'warning'
        );
        return;
      }
      mutate();
      const newData = await req.json();
      setImage(newData.output);
    } catch (e) {
      toast.show(
        t('ai_image_generic_error', 'Erro ao gerar imagem'),
        'warning'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div
        style={{
          height: '40px',
          paddingTop: '5px',
        }}
      >
        {t('generate_image_with_ai', 'Generate image with AI')}
        {data?.credits ? `(${data?.credits} left)` : ``}
      </div>
      <InputGroup
        placeholder={t('type_image_prompt', 'Type your image generation prompt here...')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleGenerate();
          }
        }}
        style={{
          marginBottom: '20px',
        }}
        inputRef={inputRef}
      />
      <Button
        onClick={handleGenerate}
        loading={loading}
        innerClassName="invert"
        style={{
          marginBottom: '40px',
        }}
      >
        {data?.credits <= 0 ? t('click_to_purchase_credits', 'Click to purchase more credits') : t('generate', 'Generate')}
      </Button>
      {image && (
        <ImagesGrid
          shadowEnabled={false}
          images={image ? [image] : []}
          getPreview={(item) => item}
          isLoading={loading}
          onSelect={async (item, pos, element) => {
            const src = item;
            if (element && element.type === 'svg' && element.contentEditable) {
              element.set({
                maskSrc: src,
              });
              return;
            }
            if (
              element &&
              element.type === 'image' &&
              element.contentEditable
            ) {
              element.set({
                src: src,
              });
              return;
            }
            const { width, height } = await getImageSize(src);
            const x = (pos?.x || store.width / 2) - width / 2;
            const y = (pos?.y || store.height / 2) - height / 2;
            store.activePage?.addElement({
              type: 'image',
              src: src,
              width,
              height,
              x,
              y,
            });
          }}
          rowsNumber={1}
        />
      )}
    </>
  );
});
const PictureGeneratorPanel = observer(({ store }: any) => {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <GenerateTab store={store} />
    </div>
  );
});

// define the new custom section
export const PictureGeneratorSection = {
  name: 'picture-generator-ai',
  Tab: (props: any) => (
    <SectionTab name="AI Img" {...props}>
      <Clean />
    </SectionTab>
  ),
  // we need observer to update component automatically on any store changes
  Panel: PictureGeneratorPanel,
};
