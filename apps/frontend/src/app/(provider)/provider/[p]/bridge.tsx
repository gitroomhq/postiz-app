'use client';
import { FC, useEffect, useRef, useState } from 'react';
import {
  ProviderPreviewComponent,
  type ProviderPreviewHandle,
  type ProviderPreviewProps,
  type ProviderPreviewValidation,
} from '@gitroom/frontend/components/provider-preview/preview.provider.component';

type InitPayload = {
  value?: Record<string, unknown>;
  errors?: string[];
  integration?: ProviderPreviewProps['integration'];
  /**
   * Per-post media (outer array = thread entries, inner = media items).
   * Passed to the provider's `checkValidity` function during validation.
   */
  posts?: Array<Array<{ path: string; thumbnail?: string }>>;
};

declare global {
  interface Window {
    __PROVIDER_INIT__?: InitPayload;
    __getProviderPreviewValues__?: () => Record<string, unknown>;
    __validateProviderPreview__?: () => Promise<ProviderPreviewValidation>;
    /**
     * Returns the provider's resolved character limit (number) or null when
     * the provider doesn't declare one. Resolution uses the seeded
     * __PROVIDER_INIT__.integration.additionalSettings (e.g. X bumps to
     * 4000 when {title:'Verified', value:true} is present).
     */
    __getProviderMaxCharacters__?: () => number | null;
  }
}

const ProviderPreviewBridge: FC<{ provider: string }> = ({
  provider,
}) => {
  // Read __PROVIDER_INIT__ in an effect, not via a useState lazy
  // initializer. The initializer would run on the server (where `window`
  // is undefined → {}), and during hydration React reuses the server
  // state — so the seeded payload would never reach the form. Setting
  // state inside an effect guarantees the read happens client-side
  // after mount; useForm's `values` prop then reactively resets the
  // form to the seed AFTER any field-level `register('x', { value })`
  // defaults have been applied, so the seed wins.
  const [init, setInit] = useState<InitPayload>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__PROVIDER_INIT__) {
      setInit(window.__PROVIDER_INIT__ || {});
    }
  }, []);

  const controlRef = useRef<ProviderPreviewHandle | null>(null);

  useEffect(() => {
    window.__getProviderPreviewValues__ = () =>
      controlRef.current?.getValues() ?? {};
    window.__validateProviderPreview__ = async () =>
      controlRef.current
        ? await controlRef.current.validate()
        : {
            isValid: false,
            value: {},
            errors: ['not-ready'],
            formValid: false,
            checkValidityError: null,
          };
    window.__getProviderMaxCharacters__ = () =>
      controlRef.current?.getMaximumCharacters() ?? null;
    return () => {
      delete window.__getProviderPreviewValues__;
      delete window.__validateProviderPreview__;
      delete window.__getProviderMaxCharacters__;
    };
  }, []);

  if (!init) {
    return null;
  }

  return (
    <ProviderPreviewComponent
      provider={provider}
      value={init.value}
      errors={init.errors}
      integration={init.integration}
      posts={init.posts}
      controlRef={controlRef}
    />
  );
};

export default ProviderPreviewBridge;
