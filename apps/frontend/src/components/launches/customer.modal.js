'use client';
import { __awaiter } from "tslib";
import React, { useCallback, useState } from 'react';
import { useModals } from "../layout/new-modal";
import { Autocomplete } from '@mantine/core';
import useSWR from 'swr';
import { useFetch } from "../../../../../libraries/helpers/src/utils/custom.fetch";
import { Button } from "../../../../../libraries/react-shared-libraries/src/form/button";
import { useT } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const CustomerModal = (props) => {
    var _a, _b;
    const t = useT();
    const fetch = useFetch();
    const { onClose, integration } = props;
    const [customer, setCustomer] = useState(((_a = integration.customer) === null || _a === void 0 ? void 0 : _a.name) || undefined);
    const modal = useModals();
    const loadCustomers = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        return (yield fetch('/integrations/customers')).json();
    }), []);
    const removeFromCustomer = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        saveCustomer(true);
    }), []);
    const saveCustomer = useCallback((removeCustomer) => __awaiter(void 0, void 0, void 0, function* () {
        if (!customer) {
            return;
        }
        yield fetch(`/integrations/${integration.id}/customer-name`, {
            method: 'PUT',
            body: JSON.stringify({
                name: removeCustomer ? '' : customer,
            }),
        });
        modal.closeAll();
        onClose();
    }), [customer]);
    const { data } = useSWR('/customers', loadCustomers);
    return (<div className="relative w-full">
      <div className="mb-[80px]">
        <Autocomplete value={customer} onChange={setCustomer} classNames={{
            label: 'text-white',
        }} label={t('select_customer_label', 'Select Customer')} placeholder={t('start_typing', 'Start typing...')} data={(data === null || data === void 0 ? void 0 : data.map((p) => p.name)) || []}/>
      </div>

      <div className="my-[16px] flex gap-[10px]">
        <Button onClick={() => saveCustomer()}>{t('save', 'Save')}</Button>
        {!!((_b = integration === null || integration === void 0 ? void 0 : integration.customer) === null || _b === void 0 ? void 0 : _b.name) && (<Button className="bg-red-700" onClick={removeFromCustomer}>
            {t('remove_from_customer', 'Remove from customer')}
          </Button>)}
      </div>
    </div>);
};
//# sourceMappingURL=customer.modal.js.map