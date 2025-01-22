"use client";
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useSocialMedia } from "@gitroom/frontend/app/context/social-media/context";
import { Button } from "@gitroom/react/form/button";
import { useModals } from '@mantine/modals';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { SocialMediaConfigDto } from '@gitroom/nestjs-libraries/dtos/settings/social-media-config.dto';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { Input } from '@gitroom/react/form/input';
import { SocialMediaConfig } from '@gitroom/frontend/app/context/social-media/types';
import { Select } from '@mantine/core';
import { useSearchParams } from 'next/navigation';
import { Customer } from '@gitroom/frontend/components/customers/types';



// Define the type for each social media config item
export const UpdateSocialMediaConfigForm = ({ config }: { config: SocialMediaConfig }) => {
  const modals = useModals();
  const fetch = useFetch();
  const toast = useToaster();
  const { updateSocialMediaConfig } = useSocialMedia();

  // Initialize the form resolver
  const resolver = useMemo(() => {
    return classValidatorResolver(SocialMediaConfigDto);
  }, []);

  // Initialize the form hook
  const form = useForm({
    values: {
      customerId: config.customerId || '',
      platform: config.platform || '',
      platformKey: config.platformKey || '',
      // Convert the config array to a form-friendly object for individual key-value pairs
      config: config.config.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>),
    },
    // resolver,
    resolver: undefined, // Disable resolver temporarily
    mode: 'onChange',
  });

  // Close modal
  const closeModal = useCallback(() => {
    modals.closeAll();
  }, [modals]);


  // Submit handler
  const submit: SubmitHandler<any> = useCallback(
    async (values: SocialMediaConfig) => {
      try {
        // Prepare updated config with key-value pairs
        const updatedConfig = {
          ...values,
          config: Object.keys(values.config).map((key: string | any) => ({
            key,
            value: values.config[key],
          })),
        };

        // Make the API call with a try-catch for error handling
        const response = await fetch(`/social-media-platform-config/${updatedConfig.platformKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedConfig),
        });

        if (!response.ok) {
          // Handle HTTP errors
          const errorDetails = await response.text();
          toast.show(`Failed to update social config: ${response.statusText}`, 'warning');
          return;
        }

        const result = await response.json();

        updateSocialMediaConfig(config.platform, updatedConfig);
        toast.show(`${updatedConfig.platform} configurations updated`);
        closeModal();
      } catch (error) {
        // Handle network or unexpected errors
        console.error('Network/API error:', error);
        toast.show('An error occurred while updating the social config. Please try again.', 'warning');
      }
    },
    [fetch, toast, updateSocialMediaConfig, closeModal]
  );

  useEffect(() => {
    console.log("config:: ", config);
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
          <TopTitle title={`${config.platform} Configurations`} />
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

          {Object.keys(form.getValues('config')).map((key) => (
            <Input
              key={key}
              label={key}
              placeholder={`Enter ${key}`}
              name={`config.${key}`}
            />
          ))}

          <Button type="submit" className="mt-[18px]">
            Save
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

const SocialMediaList: React.FC = () => {
  // Get the social media configuration from context
  const { socialMediaConfig, updateSocialMediaConfigListFromServer } = useSocialMedia();
  const modals = useModals();
  const fetch = useFetch();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerList, setCustomerList]: Customer[] | any = useState([]);

  const updateSocialMediaConfigForm = useCallback(
    (config: SocialMediaConfig) => {
      modals.openModal({
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        withCloseButton: false,
        children: <UpdateSocialMediaConfigForm config={config} />,
      });
    },
    [modals]
  );

  useEffect(() => {
    loadCustomerList();
  }, []);

  useEffect(() => {
    if (customerList && customerList.length > 0) {
      if (customerId) {
        const customer = customerList.find((ele: Customer) => ele.id === customerId);
        if (customer) {
          setCustomer(customer);
        }
        else {
          setCustomer(customerList[0]);
        }
      }
      else {
        setCustomer(customerList[0]);
      }
    }
  }, [customerList]);

  useEffect(() => {
    console.log("customer::", customer)
    if (customer && customer.id) {
      updateSocialMediaConfigListFromServer(customer.id);
    }
  }, [customer]);

  const loadCustomerList = async () => {
    try {
      const apiUrl = `/customers`; // Construct the full URL

      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      if (response.ok) {
        const result: any[] = await response.json();
        setCustomerList(result || []);
      } else {
        console.error(`Failed to fetch social media config: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to fetch social media config:", error);
    }
  };


  return (
    <div>
      <div className="mt-[16px] mb-[16px]">
        <div>
          <Select
            value={customer?.name || ''} // Display the name of the selected customer
            onChange={(name) => {
              const selectedCustomer = customerList.find((c: any) => c.name === name);
              setCustomer(selectedCustomer); // Update the state with the whole object
            }}
            placeholder="Select Customer..."
            data={customerList.map((customer: any) => ({
              value: customer.name,
              label: customer.name,
            }))}
          />
          {customer && (
            <div className="mt-[16px]">
              <p><strong>Selected Customer:</strong></p>
              <p>Name: {customer.name}</p>
              <p>Email: {customer.email}</p>
            </div>
          )}
        </div>

      </div>

      <div>
        {/* Container for social media items */}

        {customer ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px", // Space between items
              justifyContent: "space-between", // Distribute items evenly
            }}
          >
            {/* Loop through the social media config array */}
            {socialMediaConfig.map((config) => (
              <div
                key={config.platform}
                style={{
                  flex: "1 1 calc(33.33% - 20px)", // Flexible width for 3 items per row
                  maxWidth: "calc(33.33% - 20px)", // Prevents items from exceeding 3 per row
                  height: "200px", // Fixed height
                  boxSizing: "border-box",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between", // Ensures even spacing
                }}
              >
                <h4>
                  <strong>Platform:</strong> {config.platform}
                </h4>
                <hr />

                {/* Dynamically render all config key-value pairs */}
                <div>
                  {config.config.map((item) => (
                    <div key={item.key}>
                      <strong>{item.key}:</strong> {item.value}
                    </div>
                  ))}
                </div>
                <div>
                  <Button
                    className="rounded-[4px]"
                    onClick={() => updateSocialMediaConfigForm(config)}
                  >
                    Update Config
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p>No customer selected.</p>
          </div>
        )}


      </div>




    </div>
  );
};

export default SocialMediaList;
