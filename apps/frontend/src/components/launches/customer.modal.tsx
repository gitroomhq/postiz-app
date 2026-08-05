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
    <div className="relative w-full">
      <div className="mb-[80px]">
        <Autocomplete
          value={customer}
          onChange={setCustomer}
          classNames={{
            label: 'text-[14px] text-pqMuted mb-[6px]',
            input:
              'h-[44px] rounded-[10px] border-0 bg-pqTableHeader px-[12px] text-[14px] text-pqText shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-pqSoft focus:shadow-[inset_0_0_0_1px_var(--brand)]',
            dropdown:
              'bg-pqPop border border-pqBorder rounded-[10px] shadow-pqE2 overflow-hidden',
            item: 'text-[14px] text-pqText hover:bg-pqHover data-[hovered]:bg-pqHover',
          }}
          label={t('select_customer_label', 'Select Customer')}
          placeholder={t('start_typing', 'Start typing...')}
          data={data?.map((p: any) => p.name) || []}
        />
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
