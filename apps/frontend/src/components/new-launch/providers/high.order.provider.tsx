'use client';

import React, { FC, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { IsOptional } from 'class-validator';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { IntegrationContext } from '@gitroom/frontend/components/new-launch/helpers/use.integration';
import { useShallow } from 'zustand/react/shallow';
import { timer } from '@gitroom/helpers/utils/timer';

class Empty {
  @IsOptional()
  empty: string;
}

export const TriggerComponent: FC<{form: any}> = ({ form }) => {
  useEffect(() => {
    form.trigger();
  }, []);

  return null;
}

export const withProvider = function <T extends object>(
  SettingsComponent: FC<{
    values?: any;
  }> | null,
  CustomPreviewComponent?: FC<{
    maximumCharacters?: number;
  }>,
  dto?: any,
  checkValidity?: (
    value: Array<
      Array<{
        path: string;
      }>
    >,
    settings: T,
    additionalSettings: any
  ) => Promise<string | true>,
  maximumCharacters?: number | ((settings: any) => number)
) {
  return forwardRef((props: { id: string }, ref) => {
    const {
      current,
      integrations,
      selectedIntegration,
      internal,
      global,
      date,
    } = useLaunchStore(
      useShallow((state) => ({
        date: state.date,
        global: state.global,
        internal: state.internal.find((p) => p.integration.id === props.id),
        integrations: state.selectedIntegrations,
        current: state.current === props.id,
        selectedIntegration: state.selectedIntegrations.find(
          (p) => p.integration.id === props.id
        ),
      }))
    );

    const value = useMemo(() => {
      if (internal) {
        return internal.integrationValue;
      }

      return global;
    }, []);

    const form = useForm({
      resolver: classValidatorResolver(dto || Empty),
      values: {...selectedIntegration.settings},
      mode: 'all',
      criteriaMode: 'all',
    });

    useImperativeHandle(ref, () => ({
      isValid: async () => {
        return {
          id: props.id,
          identifier: selectedIntegration.integration.identifier,
          valid: form.formState.isValid,
          values: form.getValues(),
          errors: form.formState.errors,
        };
      },
    }), [form, props.id, selectedIntegration]);

    return (
      <IntegrationContext.Provider
        value={{
          date,
          integration: selectedIntegration.integration,
          allIntegrations: integrations.map((p) => p.integration),
          value: value,
        }}
      >
        <FormProvider {...form}>
          <form>
            {SettingsComponent && (
              <div className={current ? '' : 'hidden'}>
                <SettingsComponent />
              </div>
            )}
          </form>
        </FormProvider>
      </IntegrationContext.Provider>
    );
  });
};
