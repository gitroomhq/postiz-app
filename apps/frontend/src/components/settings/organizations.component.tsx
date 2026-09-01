'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { FormProvider, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { OrganizationNameDto } from '@gitroom/nestjs-libraries/dtos/organizations/organization.name.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { EditIcon, TrashIcon } from '@gitroom/frontend/components/ui/icons';
import {
  openCreateOrganizationModal,
  useOrganizations,
} from '@gitroom/frontend/components/layout/organization.selector';

type OrganizationListItem = {
  id: string;
  name: string;
  users: { role: 'SUPERADMIN' | 'ADMIN' | 'USER' }[];
  _count?: { users: number };
};

const roleLabel = (
  t: ReturnType<typeof useT>,
  role: 'SUPERADMIN' | 'ADMIN' | 'USER'
) =>
  role === 'SUPERADMIN'
    ? t('super_admin', 'Super Admin')
    : role === 'ADMIN'
    ? t('admin', 'Admin')
    : t('user', 'User');

const EditOrganizationForm: FC<{
  org: OrganizationListItem;
  onSaved: () => void;
}> = ({ org, onSaved }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => classValidatorResolver(OrganizationNameDto), []);
  const form = useForm({ resolver, values: { name: org.name } });

  const submit = useCallback(
    async (values: { name: string }) => {
      setLoading(true);
      try {
        const response = await fetch(`/user/organizations/${org.id}`, {
          method: 'POST',
          body: JSON.stringify(values),
        });

        if (response.status !== 200 && response.status !== 201) {
          const { message } = await response.json().catch(() => ({
            message: '',
          }));
          toaster.show(
            message ||
              t(
                'could_not_rename_organization',
                'Could not rename the organization'
              ),
            'warning'
          );
          return;
        }

        toaster.show(
          t('organization_renamed', 'Organization renamed'),
          'success'
        );
        onSaved();
      } finally {
        setLoading(false);
      }
    },
    [org.id, onSaved]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <Input
            label={t('organization_name', 'Organization name')}
            name="name"
          />
          <Button type="submit" loading={loading} className="mt-[18px]">
            {t('save', 'Save')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const OrganizationRow: FC<{
  org: OrganizationListItem;
  isCurrent: boolean;
  mutate: () => Promise<any>;
}> = ({ org, isCurrent, mutate }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const modals = useModals();
  const role = org.users[0]?.role;
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN';
  const membersCount = org._count?.users ?? 1;

  const edit = useCallback(() => {
    modals.openModal({
      title: t('edit_organization', 'Edit organization'),
      withCloseButton: true,
      children: (
        <EditOrganizationForm
          org={org}
          onSaved={async () => {
            modals.closeAll();
            await mutate();
          }}
        />
      ),
    });
  }, [modals, org, mutate, t]);

  const remove = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'delete_organization_confirm',
          'This organization, its channels and posts will be deleted permanently. This action cannot be undone, are you sure?'
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
      const { message } = await response.json().catch(() => ({
        message: '',
      }));
      toaster.show(
        message ||
          t(
            'could_not_delete_organization',
            'Could not delete the organization'
          ),
        'warning'
      );
      return;
    }

    await mutate();
    if (isCurrent) {
      window.location.reload();
    }
  }, [org.id, isCurrent, mutate]);

  return (
    <div className="flex items-center gap-[16px] py-[12px] border-b border-newTableBorder last:border-b-0">
      <div className="flex-1 flex items-center gap-[8px]">
        {org.name}
        {isCurrent && (
          <span className="text-[11px] font-[600] px-[8px] py-[2px] rounded-full bg-boxFocused text-textItemFocused">
            {t('current', 'Current')}
          </span>
        )}
      </div>
      <div className="w-[110px]">{roleLabel(t, role)}</div>
      <div className="w-[140px] text-customColor18">
        {t('members_count', `${membersCount} members`, {
          count: membersCount,
        })}
      </div>
      <div className="flex gap-[12px] justify-end w-[64px]">
        {canManage && (
          <div
            className="cursor-pointer text-customColor18 hover:text-newTextColor"
            onClick={edit}
          >
            <EditIcon size={16} />
          </div>
        )}
        {canManage && (
          <div
            className="cursor-pointer text-red-400 hover:text-red-500"
            onClick={remove}
          >
            <TrashIcon size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

export const OrganizationsComponent = () => {
  const t = useT();
  const user = useUser();
  const modals = useModals();
  const { data, mutate } = useOrganizations();

  const createOrganization = useCallback(() => {
    openCreateOrganizationModal(modals, t, async () => {
      modals.closeAll();
      await mutate();
    });
  }, [modals, t, mutate]);

  const sortedData = useMemo(
    () => [...(data || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('organizations', 'Organizations')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'organizations_description',
          'Create, rename or delete the organizations you own'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="flex items-center justify-between">
          <div className="mt-[4px]">{t('organizations', 'Organizations')}</div>
          {!user?.impersonate && (
            <Button onClick={createOrganization}>
              {t('create_organization', 'Create organization')}
            </Button>
          )}
        </div>
        <div className="flex flex-col">
          {sortedData.map((org: OrganizationListItem) => (
            <OrganizationRow
              key={org.id}
              org={org}
              isCurrent={org.id === user?.orgId}
              mutate={mutate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
