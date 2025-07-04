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
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    Instagram: false,
    Facebook: false,
    Youtube: false,
    Thread: false,
    X: false,
    Pinterest: false,
    LinkedIn: false,
    GBP: false,
    Website: false,
  });
  const [isDownloading, setIsDownloading] = useState(false);

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

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, JSX.Element> = {
      Instagram: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
      </svg>,
      Facebook: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>,
      Youtube: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>,
      Thread: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 7.5V12a7 7 0 01-7 7v0a7 7 0 01-7-7V7.5M12 19v3M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2"/>
      </svg>,
      X: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>,
      Pinterest: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20a8 8 0 01-8-8 8 8 0 018-8 8 8 0 018 8 8 8 0 01-8 8z" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 20v-6a2 2 0 012-2v0a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
      </svg>,
      LinkedIn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>,
      GBP: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>,
      Website: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    };
    return icons[platform] || <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>;
  };

  const handleDownloadReport = useCallback(async () => {
    if (!customer?.id) {
      console.error('No customer selected');
      return;
    }

    setIsDownloading(true);

    try {
      // Get current date for month and year
      const currentDate = new Date();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const year = currentDate.getFullYear();

      // Map frontend platform names to backend parameter names
      const platformMappings: Record<string, string> = {
        Instagram: 'instagram',
        Facebook: 'facebook',
        Youtube: 'youtube',
        X: 'x',
        LinkedIn: 'linkedin',
        Thread: 'thread',
        Pinterest: 'pinterest',
        GBP: 'gbp',
        Website: 'website'
      };

      // Build query parameters
      const params = new URLSearchParams();
      params.append('customerId', customer.id);
      params.append('month', month);
      params.append('year', String(year));

      // Add platform parameters
      Object.entries(selectedPlatforms).forEach(([platform, isSelected]) => {
        const backendParam = platformMappings[platform];
        if (backendParam) {
          params.append(backendParam, String(isSelected));
        }
      });

      // Make the API call
      const response = await fetch(`/report-download/combined?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      // Handle the PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-media-report-${customer.name}-${month}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      // You can add toast notification here if needed
    } finally {
      setIsDownloading(false);
    }
  }, [customer, selectedPlatforms, fetch]);

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

  const DownloadModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-sixth p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Select Platforms</h3>
          <button 
            onClick={() => setShowDownloadModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-3 mb-6">
          {Object.entries(selectedPlatforms).map(([platform, checked]) => (
            <label key={platform} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePlatform(platform)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
              />
              <div className="flex items-center">
                {getPlatformIcon(platform)}
                <span className="ml-2 text-sm">{platform}</span>
              </div>
            </label>
          ))}
        </div>
        
        <Button
          onClick={handleDownloadReport}
          className="w-full bg-blue-600 hover:bg-blue-700"
          loading={isDownloading}
          disabled={isDownloading}
        >
          {isDownloading ? 'Downloading...' : 'Confirm Download'}
        </Button>
      </div>
    </div>
  );

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
              <div className="mt-[8px]">
                <Button 
                  onClick={() => setShowDownloadModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center gap-2"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        {customer ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              justifyContent: "space-between",
            }}
          >
            {socialMediaConfig.map((config) => (
              <div
                key={config.platform}
                style={{
                  flex: "1 1 calc(33.33% - 20px)",
                  maxWidth: "calc(33.33% - 20px)",
                  height: "200px",
                  boxSizing: "border-box",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <h4>
                  <strong>Platform:</strong> {config.platform}
                </h4>
                <hr />
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

      {showDownloadModal && <DownloadModal />}
    </div>
  );
};

export default SocialMediaList;