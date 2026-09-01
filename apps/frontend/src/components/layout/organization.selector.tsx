'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import clsx from 'clsx';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { FormProvider, useForm } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { OrganizationNameDto } from '@gitroom/nestjs-libraries/dtos/organizations/organization.name.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useClickOutside } from '@mantine/hooks';
import { DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';
import {
  dropdownPanelClass,
  DropdownRow,
} from '@gitroom/frontend/components/layout/dropdown.styles';

export const useOrganizations = () => {
  const fetch = useFetch();
  const load = useCallback(async () => {
    return await (await fetch('/user/organizations')).json();
  }, []);
  return useSWR('organizations', load, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
    revalidateOnReconnect: false,
  });
};

const CreateOrganizationForm: FC<{ onCreated: (id: string) => void }> = ({
  onCreated,
}) => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const resolver = useMemo(() => classValidatorResolver(OrganizationNameDto), []);
  const form = useForm({ resolver, values: { name: '' } });

  const submit = useCallback(async (values: { name: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/user/organizations', {
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
              'could_not_create_organization',
              'Could not create the organization'
            ),
          'warning'
        );
        return;
      }

      const { id } = await response.json();
      onCreated(id);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 p-[16px] pt-0">
          <Input
            label={t('organization_name', 'Organization name')}
            placeholder={t(
              'enter_organization_name',
              'Enter organization name'
            )}
            name="name"
          />
          <Button type="submit" loading={loading} className="mt-[18px]">
            {t('create_organization', 'Create organization')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const openCreateOrganizationModal = (
  modals: ReturnType<typeof useModals>,
  t: (key: string, fallback: string) => string,
  onCreated: (id: string) => void
) => {
  modals.openModal({
    title: t('create_organization', 'Create organization'),
    classNames: {
      modal: 'bg-transparent text-textColor',
    },
    withCloseButton: true,
    children: <CreateOrganizationForm onCreated={onCreated} />,
  });
};

export const OrganizationSelector: FC<{ asOpenSelect?: boolean }> = ({
  asOpenSelect,
}) => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const modals = useModals();
  const { isLoading, data, mutate } = useOrganizations();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const current = useMemo(() => {
    return data?.find((d: any) => d.id === user?.orgId);
  }, [data, user?.orgId]);
  const sorted = useMemo(() => {
    return [...(data || [])].sort((a: any, b: any) =>
      a.name.localeCompare(b.name)
    );
  }, [data]);
  const changeOrg = useCallback(
    (org: { name: string; id: string }) => async () => {
      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({
          id: org.id,
        }),
      });
      window.location.reload();
    },
    []
  );
  const createOrganization = useCallback(() => {
    setOpen(false);
    openCreateOrganizationModal(modals, t, async (id) => {
      modals.closeAll();
      await mutate();
      await changeOrg({ id, name: '' })();
    });
  }, [mutate, changeOrg, t, modals]);
  const toggleOpen = useCallback(() => setOpen((prev) => !prev), []);
  const isPanelOpen = asOpenSelect || open;
  if (isLoading) {
    return null;
  }
  return (
    <>
      <div className="hover:text-newTextColor">
        <div className="text-[12px] relative" ref={ref}>
          {asOpenSelect && (
            <div className="bg-btnPrimary !flex !relative max-w-[500px] mx-auto py-[12px] px-[12px]">Select Organization</div>
          )}
          {!asOpenSelect && (
            <div
              onClick={toggleOpen}
              className="flex items-center gap-[6px] cursor-pointer"
            >
              {!!current?.name && (
                <div className="max-w-[240px] truncate">{current?.name}</div>
              )}
              <DropdownArrowIcon size={16} rotated={open} />
            </div>
          )}
          <div
            className={dropdownPanelClass(
              isPanelOpen,
              clsx(
                'min-w-[240px]',
                asOpenSelect &&
                  '!relative !translate-y-0 max-w-[500px] mx-auto mb-[10px]'
              )
            )}
          >
            {sorted?.map(
              (org: {
                name: string;
                id: string;
                users: { role: 'SUPERADMIN' | 'ADMIN' | 'USER' }[];
              }) =>
                org.id === user?.orgId ? (
                  <DropdownRow
                    key={org.id}
                    selected
                    className="truncate cursor-default"
                  >
                    {org.name}
                  </DropdownRow>
                ) : (
                  <DropdownRow
                    key={org.id}
                    onClick={changeOrg(org)}
                    className="truncate"
                  >
                    {org.name}
                  </DropdownRow>
                )
            )}
            {!user?.impersonate && (
              <>
                <div className="border-t border-newTextColor/10 my-[8px]" />
                <DropdownRow
                  onClick={createOrganization}
                  className="truncate text-customColor18"
                >
                  + {t('create_organization', 'Create organization')}
                </DropdownRow>
              </>
            )}
          </div>
        </div>
      </div>
      {!asOpenSelect && <div className="w-[1px] h-[20px] bg-blockSeparator" />}
    </>
  );
};
