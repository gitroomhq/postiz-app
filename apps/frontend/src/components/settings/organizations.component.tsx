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
import { TrashIcon } from '@gitroom/frontend/components/ui/icons';
import {
  openCreateOrganizationModal,
  useOrganizations,
} from '@gitroom/frontend/components/layout/organization.selector';

type OrganizationListItem = {
  id: string;
  name: string;
  users: { role: 'SUPERADMIN' | 'ADMIN' | 'USER' }[];
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

const OrganizationRow: FC<{
  org: OrganizationListItem;
  isCurrent: boolean;
  mutate: () => Promise<any>;
}> = ({ org, isCurrent, mutate }) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const isSuperAdmin = org.users[0]?.role === 'SUPERADMIN';
  const resolver = useMemo(() => classValidatorResolver(OrganizationNameDto), []);
  const form = useForm({ resolver, values: { name: org.name } });

  const rename = useCallback(async (values: { name: string }) => {
    if (values.name === org.name) {
      return;
    }
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

      await mutate();
      toaster.show(t('organization_renamed', 'Organization renamed'), 'success');
    } finally {
      setLoading(false);
    }
  }, [org.id, org.name, mutate]);

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
    <div className="flex items-center gap-[16px]">
      <div className="flex-1">
        {isSuperAdmin ? (
          // Not a <form> - this list already sits inside the settings
          // popup's own <form>, and nested forms are invalid HTML.
          <FormProvider {...form}>
            <div onBlur={() => form.handleSubmit(rename)()}>
              <Input
                label=""
                removeError={true}
                disabled={loading}
                name="name"
              />
            </div>
          </FormProvider>
        ) : (
          <div className="h-[42px] flex items-center">{org.name}</div>
        )}
      </div>
      <div className="w-[110px]">{roleLabel(t, org.users[0]?.role)}</div>
      <div className="w-[80px]">
        {isCurrent && (
          <span className="text-customColor18">{t('current', 'Current')}</span>
        )}
      </div>
      <div className="w-[40px] flex justify-end">
        {isSuperAdmin && (
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

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('organizations', 'Organizations')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t(
          'organizations_description',
          'Create, rename or delete the organizations you own'
        )}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[16px]">
        {(data || []).map((org: OrganizationListItem) => (
          <OrganizationRow
            key={org.id}
            org={org}
            isCurrent={org.id === user?.orgId}
            mutate={mutate}
          />
        ))}
        {!user?.impersonate && (
          <div>
            <Button onClick={createOrganization}>
              {t('create_organization', 'Create organization')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
