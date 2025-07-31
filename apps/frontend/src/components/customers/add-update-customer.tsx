"use client";
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Button } from "@gitroom/react/form/button";
import { useModals } from '@mantine/modals';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { CustomerDto } from '@gitroom/nestjs-libraries/dtos/customers/customers';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { Customer } from '@gitroom/frontend/components/customers/types';



interface AddUpdateCustomerFormProps {
  currentCustomer: Customer | null;
  onCustomerUpdated: (customer: Customer) => void; // Callback for parent
}

export const AddUpdateCustomerForm = ({
  currentCustomer,
  onCustomerUpdated,
}: AddUpdateCustomerFormProps) => {
  const modals = useModals();
  const fetch = useFetch();
  const toast = useToaster();

  // Initialize the form resolver
  const resolver = useMemo(() => {
    return classValidatorResolver(CustomerDto);
  }, []);

  const [uploading, setUploading] = useState(false);

  const uploadLogo = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/upload', { method: 'POST', body: form });
    const { url } = await res.json();
    setValue('brandLogo', url);   // react-hook-form
    setUploading(false);
  };
  // Initialize the form hook
  const form = useForm({
    values: {
      name: currentCustomer?.name || '',
      email: currentCustomer?.email || '',
      phone: currentCustomer?.phone || '',
      brandName: currentCustomer?.brandName || '',   // NEW
      brandLogo: currentCustomer?.brandLogo || '',   // NEW
    },
    resolver: undefined, // Disable resolver temporarily
    mode: 'onChange',
  });
  const { setValue, watch } = form;   // 👈 add this line

  const closeModal = useCallback(() => {
    modals.closeAll();
  }, [modals]);

  const submit: SubmitHandler<any> = useCallback(
    async (values: Customer) => {
      try {
        let apiUrl;
        let method;
        let response;

        if (currentCustomer) {
          // Edit customer logic
          apiUrl = `/customers/${currentCustomer.id}`;
          method = 'PUT';
        } else {
          // Add new customer
          apiUrl = `/customers`;
          method = 'POST';
        }

        response = await fetch(apiUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });

        if (response.ok) {
          const updatedCustomer = await response.json(); // Assuming API returns the updated/added customer
          toast.show(`Customer ${currentCustomer ? 'updated' : 'added'} successfully`);
          onCustomerUpdated(updatedCustomer); // Notify the parent
          closeModal();
        } else {
          toast.show(`Failed to ${currentCustomer ? 'update' : 'add'} customer: ${response.statusText}`, 'warning');
        }
      } catch (error) {
        toast.show(`Error adding/updating customer`, 'warning');
        console.error('Error adding/updating customer:', error);
      }
    },
    [fetch, toast, closeModal, currentCustomer, onCustomerUpdated]
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
          <TopTitle title={`${currentCustomer ? 'Edit' : 'Add'} Customer`} />
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
            type="button"
          >
            <svg
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>

          <Input key="name" label="Name" placeholder="Enter Name" name="name" />
          <Input key="email" label="Email" placeholder="Enter Email" name="email" />
          <Input key="phone" label="Phone" placeholder="Enter Phone" name="phone" />
          <Input label="Brand Name" name="brandName" placeholder="e.g. Acme Inc." />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => uploadLogo(e.target.files![0])}
            className="file-input"
          />
          {uploading && <p className="text-sm text-gray-500">Uploading…</p>}
          {form.watch('brandLogo') && (
            <img
              src={form.watch('brandLogo')}
              alt="preview"
              className="w-20 h-20 rounded-md object-cover"
            />)}
          <Button type="submit" className="mt-[18px]">
            Save
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};


