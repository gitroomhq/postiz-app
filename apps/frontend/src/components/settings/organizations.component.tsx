'use client';

import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import React, { FC, useCallback, useMemo } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { useForm, FormProvider } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { OrganizationNameDto } from '@gitroom/nestjs-libraries/dtos/organizations/organization.name.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export type UserOrganization = {
  id: string;
  name: string;
  users: { role: 'SUPERADMIN' | 'ADMIN' | 'USER'; disabled: boolean }[];
};

export const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return (await fetch('/user/organizations')).json();
  }, [fetch]);

  return useSWR<UserOrganization[]>('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

const roleLabel = (
  role: 'SUPERADMIN' | 'ADMIN' | 'USER',
  t: ReturnType<typeof useT>
) => {
  if (role === 'SUPERADMIN') {
    return t('super_admin', 'Super Admin');
  }
  if (role === 'ADMIN') {
    return t('admin', 'Admin');
  }
  return t('user', 'User');
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const body = await response.json().catch(() => ({ message: '' }));
  const message = Array.isArray(body.message) ? body.message[0] : body.message;
  return message || fallback;
};

export const OrganizationNameModal: FC<{
  name?: string;
  button: string;
  onSubmit: (name: string) => Promise<void>;
}> = ({ name = '', button, onSubmit }) => {
  const t = useT();
  const resolver = useMemo(() => {
    return classValidatorResolver(OrganizationNameDto);
  }, []);
  const form = useForm({
    values: {
      name,
    },
    resolver,
    mode: 'onChange',
  });
  const submit = useCallback(
    async (values: { name: string }) => {
      await onSubmit(values.name);
    },
    [onSubmit]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <Input
            label="Organization name"
            translationKey="organization_name"
            name="name"
            placeholder={t('organization_name', 'Organization name')}
          />
          <Button type="submit" className="mt-[18px]">
            {button}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const OrganizationsComponent = () => {
  const fetch = useFetch();
  const user = useUser();
  const modals = useModals();
  const toast = useToaster();
  const t = useT();
  const { data, mutate } = useOrganizations();
  const impersonating = !!user?.impersonate;

  const changeOrg = useCallback(
    (org: UserOrganization) => async () => {
      if (org.id === user?.orgId) {
        return;
      }
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({
          id: org.id,
        }),
      });
      window.location.reload();
    },
    [fetch, user?.orgId]
  );

  const createOrganization = useCallback(async (name: string) => {
    const response = await fetch('/user/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (response.status !== 200 && response.status !== 201) {
      toast.show(
        await readErrorMessage(
          response,
          t('could_not_create_organization', 'Could not create organization')
        ),
        'warning'
      );
      return;
    }
    window.location.reload();
  }, [fetch, t, toast]);

  const renameOrganization = useCallback(
    (org: UserOrganization) => async (name: string) => {
      const response = await fetch(`/user/organizations/${org.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      if (response.status !== 200 && response.status !== 201) {
        toast.show(
          await readErrorMessage(
            response,
            t('could_not_rename_organization', 'Could not rename organization')
          ),
          'warning'
        );
        return;
      }
      await mutate();
      modals.closeAll();
      toast.show(t('organization_renamed', 'Organization renamed'));
    },
    [fetch, t, toast, mutate, modals]
  );

  const openCreate = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      title: t('create_organization', 'Create organization'),
      withCloseButton: true,
      children: (
        <OrganizationNameModal
          button={t('create_organization', 'Create organization')}
          onSubmit={createOrganization}
        />
      ),
    });
  }, [t, createOrganization, modals]);

  const openRename = useCallback(
    (org: UserOrganization) => () => {
      modals.openModal({
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        title: t('rename_organization', 'Rename organization'),
        withCloseButton: true,
        children: (
          <OrganizationNameModal
            name={org.name}
            button={t('rename_organization', 'Rename organization')}
            onSubmit={renameOrganization(org)}
          />
        ),
      });
    },
    [t, renameOrganization, modals]
  );

  const remove = useCallback(
    (org: UserOrganization) => async () => {
      if (
        !(await deleteDialog(
          t(
            'delete_organization_confirm',
            'This organization, its channels and posts will be deleted. This action cannot be undone, are you sure?'
          ),
          t('yes_delete_organization', 'Yes, delete this organization')
        ))
      ) {
        return;
      }
      const response = await fetch(`/user/organizations/${org.id}`, {
        method: 'DELETE',
      });
      if (response.status !== 200 && response.status !== 201) {
        toast.show(
          await readErrorMessage(
            response,
            t('could_not_delete_organization', 'Could not delete organization')
          ),
          'warning'
        );
        return;
      }
      window.location.reload();
    },
    [fetch, t, toast]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('organizations', 'Organizations')}</h3>
      <div className="text-textItemBlur mt-[4px]">
        {t(
          'organizations_description',
          'Create organizations to separate projects, then switch between them'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[16px]">
          {(data || []).map((org) => {
            const role = org.users?.[0]?.role;
            const isCurrent = org.id === user?.orgId;
            const isOwner = role === 'SUPERADMIN';
            const canDelete = isOwner && (data || []).length > 1;
            return (
              <div key={org.id} className="flex items-center gap-[12px]">
                <div className="flex-1 min-w-0 truncate">{org.name}</div>
                <div className="flex-1 text-textItemBlur">
                  {role ? roleLabel(role, t) : ''}
                  {isCurrent
                    ? ` · ${t('current_organization', 'Current')}`
                    : ''}
                </div>
                <div className="flex-1 flex justify-end gap-[8px]">
                  {!isCurrent && (
                    <Button
                      className="!h-[24px] rounded-[4px] text-[12px]"
                      onClick={changeOrg(org)}
                      secondary={true}
                    >
                      {t('switch', 'Switch')}
                    </Button>
                  )}
                  {isOwner && !impersonating && (
                    <Button
                      className="!h-[24px] rounded-[4px] text-[12px]"
                      onClick={openRename(org)}
                      secondary={true}
                    >
                      {t('rename', 'Rename')}
                    </Button>
                  )}
                  {canDelete && !impersonating && (
                    <Button
                      className="!bg-red-800 !h-[24px] rounded-[4px] text-[12px]"
                      onClick={remove(org)}
                    >
                      {t('delete', 'Delete')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!impersonating && (
          <div>
            <Button onClick={openCreate}>
              {t('create_organization', 'Create organization')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
