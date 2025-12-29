'use client';

import React, {
  FC,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { IsOptional } from 'class-validator';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useShallow } from 'zustand/react/shallow';
import { GeneralPreviewComponent } from '@gitroom/frontend/components/launches/general.preview.component';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { InternalChannels } from '@gitroom/frontend/components/launches/internal.channels';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

class Empty {
  @IsOptional()
  empty: string;
}

export enum PostComment {
  ALL,
  POST,
  COMMENT,
}

interface CharacterCondition {
  format: 'no-pictures' | 'with-pictures';
  type: 'post' | 'comment';
  maximumCharacters: number;
}

export const withProvider = function <T extends object>(params: {
  comments?: boolean | 'no-media';
  postComment: PostComment;
  minimumCharacters: CharacterCondition[];
  SettingsComponent: FC<{
    values?: any;
  }> | null;
  CustomPreviewComponent?: FC<{
    maximumCharacters?: number;
  }>;
  dto?: any;
  checkValidity?: (
    value: Array<
      Array<{
        path: string;
        thumbnail?: string;
      }>
    >,
    settings: T,
    additionalSettings: any
  ) => Promise<string | true>;
  maximumCharacters?: number | ((settings: any) => number);
}) {
  const {
    postComment,
    SettingsComponent,
    CustomPreviewComponent,
    dto,
    checkValidity,
    maximumCharacters,
  } = params;

  return forwardRef((props: { id: string }, ref) => {
    const t = useT();
    const fetch = useFetch();
    const {
      current,
      selectedIntegration,
      setCurrent,
      internal,
      global,
      date,
      isGlobal,
      tab,
      setTotalChars,
      justCurrent,
      allIntegrations,
      setPostComment,
      setEditor,
      dummy,
      setChars,
      setComments,
      setHide
    } = useLaunchStore(
      useShallow((state) => ({
        date: state.date,
        tab: state.tab,
        global: state.global,
        dummy: state.dummy,
        internal: state.internal.find((p) => p.integration.id === props.id),
        integrations: state.selectedIntegrations,
        setHide: state.setHide,
        allIntegrations: state.integrations,
        justCurrent: state.current,
        current: state.current === props.id,
        isGlobal: state.current === 'global',
        setCurrent: state.setCurrent,
        setComments: state.setComments,
        setTotalChars: state.setTotalChars,
        setPostComment: state.setPostComment,
        setEditor: state.setEditor,
        setChars: state.setChars,
        selectedIntegration: state.selectedIntegrations.find(
          (p) => p.integration.id === props.id
        ),
      }))
    );

    useEffect(() => {
      if (!setTotalChars) {
        return;
      }

      setChars(
        props.id,
        typeof maximumCharacters === 'number'
          ? maximumCharacters
          : maximumCharacters(
              JSON.parse(
                selectedIntegration.integration.additionalSettings || '[]'
              )
            )
      );

      if (isGlobal) {
        setComments(true);
        setPostComment(PostComment.ALL);
        setTotalChars(0);
        setEditor('normal');
      }

      if (current) {
        setComments(typeof params.comments === 'undefined' ? true : params.comments);
        setEditor(selectedIntegration?.integration.editor);
        setPostComment(postComment);
        setTotalChars(
          typeof maximumCharacters === 'number'
            ? maximumCharacters
            : maximumCharacters(
                JSON.parse(
                  selectedIntegration.integration.additionalSettings || '[]'
                )
              )
        );
      }
    }, [justCurrent, current, isGlobal, setTotalChars]);

    const getInternalPlugs = useCallback(async () => {
      return (
        await fetch(
          `/integrations/${selectedIntegration.integration.identifier}/internal-plugs`
        )
      ).json();
    }, [selectedIntegration.integration.identifier]);
    const { data, isLoading } = useSWR(
      `internal-${selectedIntegration.integration.identifier}`,
      getInternalPlugs,
      {
        revalidateOnReconnect: true,
      }
    );

    const value = useMemo(() => {
      if (internal?.integrationValue?.length) {
        return internal.integrationValue;
      }

      return global;
    }, [internal, global, isGlobal]);

    const form = useForm({
      resolver: classValidatorResolver(dto || Empty),
      ...(Object.keys(selectedIntegration.settings).length > 0
        ? { values: { ...selectedIntegration.settings } }
        : {}),
      mode: 'all',
      criteriaMode: 'all',
      reValidateMode: 'onChange',
    });

    useImperativeHandle(
      ref,
      () => ({
        isValid: async () => {
          const settings = form.getValues();
          return {
            id: props.id,
            identifier: selectedIntegration.integration.identifier,
            integration: selectedIntegration.integration,
            valid: await form.trigger(),
            err: form.formState.errors,
            errors: checkValidity
              ? await checkValidity(
                  value.map((p) => p.media || []),
                  settings,
                  JSON.parse(
                    selectedIntegration.integration.additionalSettings || '[]'
                  )
                )
              : true,
            settings,
            values: value,
            maximumCharacters:
              typeof maximumCharacters === 'number'
                ? maximumCharacters
                : maximumCharacters(
                    JSON.parse(
                      selectedIntegration.integration.additionalSettings || '[]'
                    )
                  ),
            fix: () => {
              setCurrent(props.id);
              setHide(true);
            },
            preview: () => {
              setCurrent(props.id);
              setHide(true);
            },
          };
        },
        getValues: () => {
          return {
            id: props.id,
            identifier: selectedIntegration.integration.identifier,
            values: value,
            settings: form.getValues(),
          };
        },
        trigger: () => {
          return form.trigger();
        },
      }),
      [value]
    );

    return (
      <IntegrationContext.Provider
        value={{
          date,
          integration: selectedIntegration.integration,
          allIntegrations,
          value: value.map((p) => ({
            id: p.id,
            content: p.content,
            image: p.media,
          })),
        }}
      >
        <FormProvider {...form}>
          <div className={clsx('border border-borderPreview rounded-[12px] shadow-previewShadow', !current && 'hidden')}>
            {current &&
              (tab === 0 ||
                (!SettingsComponent && !data?.internalPlugs?.length)) &&
              !value?.[0]?.content?.length && (
                <div>
                  {t(
                    'start_writing_your_post',
                    'Start writing your post for a preview'
                  )}
                </div>
              )}
            {current &&
              (tab === 0 ||
                (!SettingsComponent && !data?.internalPlugs?.length)) &&
              !!value?.[0]?.content?.length &&
              (CustomPreviewComponent ? (
                <CustomPreviewComponent
                  maximumCharacters={
                    typeof maximumCharacters === 'number'
                      ? maximumCharacters
                      : maximumCharacters(
                          JSON.parse(
                            selectedIntegration.integration
                              .additionalSettings || '[]'
                          )
                        )
                  }
                />
              ) : (
                <GeneralPreviewComponent
                  maximumCharacters={
                    typeof maximumCharacters === 'number'
                      ? maximumCharacters
                      : maximumCharacters(
                          JSON.parse(
                            selectedIntegration.integration
                              .additionalSettings || '[]'
                          )
                        )
                  }
                />
              ))}
            {(SettingsComponent || !!data?.internalPlugs?.length) &&
              createPortal(
                <div data-id={props.id} className="hidden">
                  <SettingsComponent />
                  {!!data?.internalPlugs?.length && !dummy && (
                    <InternalChannels plugs={data?.internalPlugs} />
                  )}
                </div>,
                document.querySelector('#social-settings') || document.createElement('div')
              )}
            {current &&
              !SettingsComponent &&
              createPortal(
                <style>{`#wrapper-settings {display: none !important;} #social-empty {display: block !important;}`}</style>,
                document.querySelector('#social-settings') || document.createElement('div')
              )}
          </div>
        </FormProvider>
      </IntegrationContext.Provider>
    );
  });
};
