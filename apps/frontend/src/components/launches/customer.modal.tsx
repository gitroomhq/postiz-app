'use client';

import React, { FC, useCallback, useEffect, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Integration } from '@prisma/client';
import { Autocomplete } from '@mantine/core';
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
    <div className="relative w-full rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(10,14,26,0.9))] p-[18px] shadow-[0_24px_60px_rgba(2,6,23,0.22)] backdrop-blur-xl">
      <div className="mb-[80px]">
        <Autocomplete
          value={customer}
          onChange={setCustomer}
          classNames={{
            label: 'text-textColor font-[600]',
            input:
              'bg-[rgba(15,23,42,0.82)] border border-white/10 text-textColor rounded-[12px] focus:border-[#38bdf8]/45',
            dropdown:
              'rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(10,14,26,0.98))] shadow-[0_24px_60px_rgba(2,6,23,0.4)] backdrop-blur-xl',
            item:
              'text-textColor hover:bg-white/6',
          }}
          label={t('select_customer_label', 'Select Customer')}
          placeholder={t('start_typing', 'Start typing...')}
          data={data?.map((p: any) => p.name) || []}
        />
      </div>

      <div className="mb-[4px] mt-[16px] flex gap-[10px]">
        <Button className="rounded-[12px]" onClick={() => saveCustomer()}>
          {t('save', 'Save')}
        </Button>
        {!!integration?.customer?.name && (
          <Button
            className="rounded-[12px] bg-[rgba(190,24,93,0.9)] text-white hover:bg-[rgba(190,24,93,1)]"
            onClick={removeFromCustomer}
          >
            {t('remove_from_customer', 'Remove from customer')}
          </Button>
        )}
      </div>
    </div>
  );
};
