'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Integration } from '@prisma/client';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const CustomerModal: FC<{
  integration: Integration & {
    customer?: {
      id: string;
      name: string;
    };
  };
  onClose: () => void;
}> = (props) => {
  const t = useT();

  const fetch = useFetch();
  const { onClose, integration } = props;
  const [customer, setCustomer] = useState(
    integration.customer?.name || undefined
  );
  const modal = useModals();
  const loadCustomers = useCallback(async () => {
    return (await fetch('/integrations/customers')).json();
  }, []);
  const removeFromCustomer = useCallback(async () => {
    saveCustomer(true);
  }, []);
  const saveCustomer = useCallback(
    async (removeCustomer?: boolean) => {
      if (!customer) {
        return;
      }
      await fetch(`/integrations/${integration.id}/customer-name`, {
        method: 'PUT',
        body: JSON.stringify({
          name: removeCustomer ? '' : customer,
        }),
      });
      modal.closeAll();
      onClose();
    },
    [customer]
  );
  const { data } = useSWR('/customers', loadCustomers);
  return (
    <div className="relative w-full">
      <div className="mb-[80px] flex flex-col gap-[6px]">
        <label htmlFor="customer-name" className="text-[14px] text-white">
          {t('select_customer_label', 'Select Customer')}
        </label>
        <input
          id="customer-name"
          list="customer-name-options"
          value={customer ?? ''}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder={t('start_typing', 'Start typing...')}
          autoComplete="off"
          className="bg-newBgColorInner h-[42px] border-newTableBorder border rounded-[8px] text-textColor placeholder-textColor px-[16px] text-[14px] outline-none"
        />
        <datalist id="customer-name-options">
          {(data?.map((p: any) => p.name) || []).map((name: string) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="my-[16px] flex gap-[10px]">
        <Button onClick={() => saveCustomer()}>{t('save', 'Save')}</Button>
        {!!integration?.customer?.name && (
          <Button className="bg-red-700" onClick={removeFromCustomer}>
            {t('remove_from_customer', 'Remove from customer')}
          </Button>
        )}
      </div>
    </div>
  );
};
