import React, { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import {
  ModalFormActions,
  useModals,
} from '@gitroom/frontend/components/layout/new-modal';
import { boolean, object, string } from 'yup';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CopilotTextarea } from '@copilotkit/react-textarea';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { SettingsPaneEditor } from '@gitroom/frontend/components/settings/settings-pane-editor';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export const SignaturesComponent: FC<{
  appendSignature?: (value: string) => void;
}> = (props) => {
  const { appendSignature } = props;
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const t = useT();
  // Composer picker still uses a modal; Settings uses the in-pane editor.
  const usePane = !appendSignature;
  const [editing, setEditing] = useState<any | null | undefined>(undefined);
  const load = useCallback(async () => {
    return (await fetch('/signatures')).json();
  }, [fetch]);
  const { data, mutate } = useSWR('signatures', load);
  const closeEditor = useCallback(() => setEditing(undefined), []);

  const openEditor = useCallback(
    (row?: any) => () => {
      if (usePane) {
        setEditing(row ?? null);
        return;
      }
      modal.openModal({
        title: row ? 'Edit Signature' : 'Add Signature',
        withCloseButton: true,
        children: (
          <AddOrRemoveSignature
            data={row}
            reload={mutate}
            onCancel={() => modal.closeCurrent()}
          />
        ),
      });
    },
    [usePane, modal, mutate]
  );

  const deleteSignature = useCallback(
    (row: any) => async () => {
      if (
        await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete',
            `Are you sure you want to delete?`,
            {
              name: stripHtmlValidation(
                'none',
                row.content,
                false,
                true,
                false
              )
                .trim()
                .slice(0, 30),
            }
          )
        )
      ) {
        await fetch(`/signatures/${row.id}`, {
          method: 'DELETE',
        });
        mutate();
        toaster.show(
          t('signature_deleted_successfully', 'Signature deleted successfully'),
          'success'
        );
      }
    },
    [fetch, mutate, toaster, t]
  );

  if (usePane && editing !== undefined) {
    return (
      <SettingsPaneEditor
        title={
          editing
            ? t('edit_signature', 'Edit Signature')
            : t('add_signature', 'Add Signature')
        }
        description={t(
          'signature_editor_description',
          'Write a short sign-off to append to your posts.'
        )}
        onBack={closeEditor}
      >
        <AddOrRemoveSignature
          data={editing || undefined}
          reload={() => {
            mutate();
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      </SettingsPaneEditor>
    );
  }

  return (
    <div className="flex flex-col">
      {!!appendSignature && (
        <>
          <h3 className="text-[20px] font-[500]">
            {t('signatures', 'Signatures')}
          </h3>
          <div className="mt-[4px] text-[14px] text-pqMuted">
            {t(
              'you_can_add_signatures_to_your_account_to_be_used_in_your_posts',
              'You can add signatures to your account to be used in your posts.'
            )}
          </div>
        </>
      )}
      {!!data?.length && (
        <div className="mt-[18px] overflow-hidden rounded-pqMd bg-pqPop shadow-[inset_0_0_0_1px_var(--border)]">
          {data?.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center gap-[11px] border-b border-pqLine p-[13px_15px] last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-[13.5px] text-pqText">
                  {stripHtmlValidation(
                    'none',
                    p.content,
                    false,
                    true,
                    false
                  ).trim()}
                </div>
                <div className="mt-[2px] text-[12px] text-pqMuted">
                  {t('auto_add', 'Auto add?')}{' '}
                  {p.autoAdd ? t('yes', 'Yes') : t('no', 'No')}
                </div>
              </div>
              {!!appendSignature && (
                <button
                  type="button"
                  onClick={() => appendSignature(p.content)}
                  className="flex h-[30px] shrink-0 items-center rounded-pqSm bg-pqSettings px-[11px] text-[12.5px] font-[500] text-pqText transition-colors hover:bg-pqHover"
                >
                  {t('use_signature', 'Use Signature')}
                </button>
              )}
              <button
                type="button"
                onClick={openEditor(p)}
                aria-label={t('edit', 'Edit')}
                title={t('edit', 'Edit')}
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqText"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={deleteSignature(p)}
                aria-label={t('delete', 'Delete')}
                title={t('delete', 'Delete')}
                className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] text-pqSoft transition-colors hover:bg-pqHover hover:text-pqWarn"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={openEditor()}
        className={clsx(
          'flex h-[34px] items-center gap-[6px] self-start rounded-pqSm bg-pqBrand ps-[11px] pe-[13px] text-[13px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover',
          (data?.length || 0) > 0 ? 'mt-[13px]' : 'mt-[18px]'
        )}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
        {t('add_a_signature', 'Add a signature')}
      </button>
    </div>
  );
};
const details = object().shape({
  content: string().required(),
  autoAdd: boolean().required(),
});
const AddOrRemoveSignature: FC<{
  data?: any;
  reload: () => void;
  onCancel: () => void;
}> = (props) => {
  const { data, reload, onCancel } = props;
  const toast = useToaster();
  const fetch = useFetch();
  const form = useForm({
    resolver: yupResolver(details),
    values: {
      content: data?.content || '',
      autoAdd: data?.autoAdd || false,
    },
  });
  const text = form.watch('content');
  const callBack = useCallback(
    async (values: any) => {
      await fetch(data?.id ? `/signatures/${data.id}` : '/signatures', {
        method: data?.id ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      toast.show(
        data?.id
          ? 'Signature updated successfully'
          : 'Signature added successfully',
        'success'
      );
      reload();
    },
    [data, fetch, reload, toast]
  );

  const t = useT();
  const { aiEnabled } = useVariables();
  const autoAdd = !!useWatch({ control: form.control, name: 'autoAdd' });
  const signatureFieldClass = clsx(
    '!min-h-28 !max-h-56 !bg-transparent p-[10px_12px] text-[14px] leading-[1.55] text-pqText outline-none overflow-x-hidden scrollbar scrollbar-thumb-pqBorder scrollbar-track-transparent placeholder:text-pqSoft w-full resize-none border-0'
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(callBack)}>
        <div className="relative flex flex-1 flex-col gap-[16px] pt-0">
          <div className="relative overflow-hidden rounded-[10px] bg-pqTableHeader shadow-[inset_0_0_0_1px_var(--border)] focus-within:shadow-[inset_0_0_0_1px_var(--brand)]">
            {aiEnabled ? (
              <CopilotTextarea
                disableBranding={true}
                className={signatureFieldClass}
                value={text}
                onChange={(e) => {
                  form.setValue('content', e.target.value);
                }}
                placeholder={t(
                  'write_your_signature',
                  'Write your signature...'
                )}
                autosuggestionsConfig={{
                  textareaPurpose: `Assist me in writing social media signature`,
                  chatApiConfigs: {},
                }}
              />
            ) : (
              <textarea
                className={signatureFieldClass}
                value={text}
                onChange={(e) => {
                  form.setValue('content', e.target.value);
                }}
                placeholder={t(
                  'write_your_signature',
                  'Write your signature...'
                )}
              />
            )}
          </div>

          {/* Boolean → checkbox (design uses Yes/No select; owner preferred check). */}
          <button
            type="button"
            role="checkbox"
            aria-checked={autoAdd}
            onClick={() => form.setValue('autoAdd', !autoAdd, { shouldDirty: true })}
            className="flex w-fit max-w-full items-start gap-[10px] rounded-[8px] text-start transition-colors"
          >
            <span
              className={clsx(
                'mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] bg-pqOnBrand text-pqBrand shadow-[inset_0_0_0_1px_var(--border)] transition-colors'
              )}
              aria-hidden="true"
            >
              {autoAdd && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-[2px]">
              <span className="text-[14px] font-[500] text-pqText">
                {t('label_auto_add_signature', 'Auto add signature')}
              </span>
              <span className="text-[12.5px] leading-[1.45] text-pqMuted">
                {t(
                  'auto_add_signature_hint',
                  'Append this signature when you create a new post.'
                )}
              </span>
            </span>
          </button>

          <div className="flex justify-end">
            <ModalFormActions onCancel={onCancel}>
              <Button
                type="submit"
                className="h-[40px] shrink-0 rounded-[10px] px-[22px] text-[13.5px] font-[600]"
              >
                {t('save', 'Save')}
              </Button>
            </ModalFormActions>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
