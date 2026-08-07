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
import SafeImage from '@gitroom/react/helpers/safe.image';

class Empty {
  @IsOptional()
  empty: string;
}

export { PostComment } from '@gitroom/frontend/components/new-launch/providers/post-comment.enum';
import { PostComment } from '@gitroom/frontend/components/new-launch/providers/post-comment.enum';

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
  maximumCharacters?: number | ((settings: any) => number);
}) {
  const {
    postComment,
    SettingsComponent,
    CustomPreviewComponent,
    dto,
    maximumCharacters,
  } = params;

  const Wrapped = forwardRef((props: { id: string }, ref) => {
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
      setHide,
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
        setComments(
          typeof params.comments === 'undefined' ? true : params.comments
        );
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
          <div
            className={clsx(
              'border border-borderPreview rounded-[12px] shadow-previewShadow',
              // Global mode stacks every selected channel preview; per-channel
              // tab still shows only the active id. Filter chips hide via CSS
              // data attribute when parent marks the card filtered out.
              !current && !isGlobal && 'hidden',
              isGlobal && 'mb-[12px] last:mb-0'
            )}
            data-preview-channel={props.id}
          >
            {(current || isGlobal) &&
              (tab === 0 ||
                (!SettingsComponent && !data?.internalPlugs?.length)) &&
              !value?.[0]?.content?.length &&
              // Global stacks many channels — one empty hint lives on the parent
              // so we don't repeat "Start writing…" per selected channel.
              !isGlobal && (
                <div>
                  {t(
                    'start_writing_your_post',
                    'Start writing your post for a preview'
                  )}
                </div>
              )}
            {(current || isGlobal) &&
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
                <div
                  data-id={props.id}
                  className={clsx(
                    isGlobal ? 'block' : 'hidden',
                    'rounded-[12px] bg-pqInner p-[16px] shadow-[inset_0_0_0_1px_var(--border)]'
                  )}
                >
                  {isGlobal && (
                    <style>{`#wrapper-settings {display: flex !important} #social-empty {display: block !important;}`}</style>
                  )}
                  {isGlobal && (
                    <div className="mb-[14px] flex items-center gap-[12px] border-b border-pqLine pb-[14px]">
                      <div className="relative">
                        <SafeImage
                          alt={selectedIntegration?.integration.name!}
                          width={36}
                          height={36}
                          className="h-[36px] min-h-[36px] w-[36px] min-w-[36px] rounded-full"
                          src={selectedIntegration?.integration.picture}
                        />
                        <SafeImage
                          alt={selectedIntegration?.integration.identifier}
                          width={14}
                          height={14}
                          className="absolute -bottom-[2px] -end-[2px] h-[14px] min-h-[14px] w-[14px] min-w-[14px] rounded-[14px]"
                          src={`/icons/platforms/${selectedIntegration?.integration.identifier}.png`}
                        />
                      </div>
                      <div className="text-[15px] font-[600] tracking-[-0.01em] text-pqText">
                        {selectedIntegration?.integration.name}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-[14px]">
                    {SettingsComponent && <SettingsComponent />}
                    {!!data?.internalPlugs?.length && !dummy && (
                      <InternalChannels plugs={data?.internalPlugs} />
                    )}
                  </div>
                </div>,
                document.querySelector('#social-settings') ||
                  document.createElement('div')
              )}
            {current &&
              !SettingsComponent &&
              createPortal(
                <style>{`#wrapper-settings {display: none !important;} #social-empty {display: block !important;}`}</style>,
                document.querySelector('#social-settings') ||
                  document.createElement('div')
              )}
          </div>
        </FormProvider>
      </IntegrationContext.Provider>
    );
  });

  // Expose the settings configuration as static metadata so the preview /
  // mobile settings page can render <SettingsComponent /> in isolation
  // without pulling the launch store + DOM portals.
  (Wrapped as any).__settings = {
    SettingsComponent,
    CustomPreviewComponent,
    dto,
    postComment,
    maximumCharacters,
  };

  return Wrapped;
};

/** Pulls the settings metadata off a withProvider-wrapped component. */
export const getProviderSettingsMeta = (component: unknown) => {
  return (component as any)?.__settings as
    | {
        SettingsComponent: FC<{ values?: any }> | null;
        CustomPreviewComponent?: FC<{ maximumCharacters?: number }>;
        dto?: any;
        postComment: PostComment;
        maximumCharacters?: number | ((settings: any) => number);
      }
    | undefined;
};
