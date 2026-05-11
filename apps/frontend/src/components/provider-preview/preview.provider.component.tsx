'use client';
import 'reflect-metadata';
import { FC, MutableRefObject, useEffect, useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Providers } from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
import { getProviderSettingsMeta } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import {
  IntegrationContext,
  type IntegrationContextType,
} from '@gitroom/frontend/components/launches/helpers/use.integration';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

type MockIntegration = IntegrationContextType['integration'];

export type ProviderPreviewValidation = {
  isValid: boolean;
  value: Record<string, unknown>;
  errors: string[];
  /** react-hook-form trigger() result. False = at least one DTO field failed. */
  formValid: boolean;
  /** Non-null when the provider's checkValidity() returned a string. */
  checkValidityError: string | null;
};

export type ProviderPreviewHandle = {
  getValues: () => Record<string, unknown>;
  validate: () => Promise<ProviderPreviewValidation>;
  /**
   * Resolves the provider's `maximumCharacters` against the seeded
   * integration.additionalSettings. Returns null when the provider doesn't
   * declare a limit (caller should treat as unbounded / fall back).
   */
  getMaximumCharacters: () => number | null;
};

export type ProviderPreviewProps = {
  /** Provider identifier (e.g. "tiktok", "instagram", "youtube"). */
  provider: string;
  /** Initial settings value (shape matches the provider's DTO). */
  value?: Record<string, unknown>;
  /**
   * Called on every form change with the current settings value — for the
   * mobile WebView bridge this is what you postMessage back.
   */
  onChange?: (value: Record<string, unknown>) => void;
  /** Validator error messages from a previous failed save, rendered above the form. */
  errors?: string[];
  /**
   * Stub integration to feed the SettingsComponent via IntegrationContext.
   * Some providers (e.g. TikTok title) branch on `integration.additionalSettings`
   * or `value[0].image` — pass what you have, leave the rest to defaults.
   */
  integration?: Partial<MockIntegration>;
  /**
   * Per-post media (outer array = thread entries, inner = media items).
   * Forwarded to the provider's `checkValidity` during validate().
   */
  posts?: Array<Array<{ path: string; thumbnail?: string }>>;
  /**
   * Imperative handle populated on mount. The parent calls
   * `controlRef.current?.validate()` / `.getValues()` to pull state on demand.
   */
  controlRef?: MutableRefObject<ProviderPreviewHandle | null>;
};

const DEFAULT_INTEGRATION: MockIntegration = {
  id: 'preview',
  name: 'Preview',
  identifier: '',
  picture: '',
  display: '',
  type: 'social',
  editor: 'normal' as const,
  disabled: false,
  inBetweenSteps: false,
  additionalSettings: '[]',
  changeProfilePicture: false,
  changeNickName: false,
  time: [] as { time: number }[],
};

/** Emits onChange whenever the form changes. Mounted inside FormProvider. */
const FormChangeEmitter: FC<{
  onChange?: (value: Record<string, unknown>) => void;
}> = ({ onChange }) => {
  const values = useWatch();
  useEffect(() => {
    if (onChange) onChange(values ?? {});
  }, [values, onChange]);
  return null;
};

const flattenFormErrors = (errs: unknown): string[] => {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (typeof n.message === 'string') out.push(n.message);
    if (n.types && typeof n.types === 'object') {
      for (const t of Object.values(n.types as Record<string, unknown>)) {
        if (typeof t === 'string') out.push(t);
      }
    }
    for (const [key, child] of Object.entries(n)) {
      if (['message', 'type', 'types', 'ref', 'root'].includes(key)) continue;
      walk(child);
    }
  };
  walk(errs);
  return out;
};

export const ProviderPreviewComponent: FC<ProviderPreviewProps> = ({
  provider,
  value,
  onChange,
  errors,
  integration,
  posts,
  controlRef,
}) => {
  const meta = useMemo(() => {
    const entry = Providers.find((p) => p.identifier === provider);
    if (!entry) return null;
    return getProviderSettingsMeta(entry.component);
  }, [provider]);

  // When `value` is absent or `{}`, don't feed it to react-hook-form at all —
  // passing an empty object as `values` wipes out DTO-level defaults that the
  // SettingsComponent relies on (e.g. tiktok privacy = PUBLIC).
  const hasSeededValue =
    !!value && typeof value === 'object' && Object.keys(value).length > 0;

  const form = useForm({
    resolver: meta?.dto ? classValidatorResolver(meta.dto) : undefined,
    defaultValues: hasSeededValue ? value : undefined,
    values: hasSeededValue ? value : undefined,
    mode: 'all',
    criteriaMode: 'all',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (!controlRef) return;
    const resolveAdditionalSettings = (): unknown[] => {
      const additional = (integration?.additionalSettings as
        | string
        | unknown[]
        | undefined) ?? '[]';
      if (Array.isArray(additional)) return additional;
      try {
        const parsed = JSON.parse(additional || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    controlRef.current = {
      getValues: () => form.getValues() as Record<string, unknown>,
      getMaximumCharacters: () => {
        const max = meta?.maximumCharacters;
        if (typeof max === 'number') return max;
        if (typeof max === 'function') {
          try {
            return max(resolveAdditionalSettings());
          } catch {
            return null;
          }
        }
        return null;
      },
      validate: async () => {
        const formValid = await form.trigger(undefined, { shouldFocus: false });
        const errs = flattenFormErrors(form.formState.errors);
        let customError: string | true = true;
        if (meta?.checkValidity) {
          try {
            customError = await meta.checkValidity(
              posts ?? [],
              form.getValues(),
              resolveAdditionalSettings(),
            );
          } catch (e: any) {
            customError = e?.message ?? 'checkValidity threw';
          }
        }
        const checkValidityError =
          customError === true ? null : customError;
        if (checkValidityError) errs.push(checkValidityError);
        return {
          isValid: formValid && checkValidityError === null,
          value: form.getValues() as Record<string, unknown>,
          errors: errs,
          formValid,
          checkValidityError,
        };
      },
    };
    return () => {
      if (controlRef.current) controlRef.current = null;
    };
  }, [controlRef, form, meta, integration, posts]);

  const contextValue = useMemo<IntegrationContextType>(
    () => ({
      date: newDayjs(),
      integration: {
        ...(DEFAULT_INTEGRATION as MockIntegration),
        identifier: provider,
        ...integration,
      } as MockIntegration,
      allIntegrations: [],
      value: [],
    }),
    [provider, integration],
  );

  if (!meta) {
    return <div>Provider &quot;{provider}&quot; not found</div>;
  }

  const { SettingsComponent } = meta;
  if (!SettingsComponent) {
    return (
      <div className="p-4 text-sm">
        This provider has no configurable settings.
      </div>
    );
  }

  return (
    <IntegrationContext.Provider value={contextValue}>
      <FormProvider {...form}>
        <div className="flex flex-col text-white p-[10px]">
          {errors && errors.length > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              <ul className="list-disc ps-5">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <FormChangeEmitter onChange={onChange} />
          <SettingsComponent />
        </div>
      </FormProvider>
    </IntegrationContext.Provider>
  );
};
