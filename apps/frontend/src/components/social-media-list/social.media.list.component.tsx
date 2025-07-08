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

  // Add state for month and year selection
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, '0')
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );

  // Generate month options (01-12)
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      return {
        value: String(monthNum).padStart(2, '0'),
        label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' })
      };
    });
  }, []);

  // Generate year options (current year and previous 5 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => {
      const year = currentYear - i;
      return {
        value: String(year),
        label: String(year)
      };
    });
  }, []);

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
        <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
      </svg>,
      Facebook: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      Youtube: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.75 15.02l5.75-3.27-5.75-3.27v6.54z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      Thread: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 7.5V12a7 7 0 01-7 7v0a7 7 0 01-7-7V7.5M12 19v3M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
      </svg>,
      X: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      Pinterest: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 20a8 8 0 01-8-8 8 8 0 018-8 8 8 0 018 8 8 8 0 01-8 8z" stroke="currentColor" strokeWidth="2" />
        <path d="M12 20v-6a2 2 0 012-2v0a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1" fill="currentColor" />
      </svg>,
      LinkedIn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      GBP: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
      Website: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    };
    return icons[platform] || <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
  };

  const handleDownloadReport = useCallback(async () => {
    if (!customer?.id) {
      console.error('No customer selected');
      return;
    }

    setIsDownloading(true);

    try {
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
      params.append('month', selectedMonth);
      params.append('year', selectedYear);

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
      a.download = `social-media-report-${customer.name}-${selectedMonth}-${selectedYear}.pdf`;
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
  }, [customer, selectedPlatforms, fetch, selectedMonth, selectedYear]);

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
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Add month and year selection */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <Select
              value={selectedMonth}
              onChange={(value) => setSelectedMonth(value || '01')}
              data={monthOptions}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <Select
              value={selectedYear}
              onChange={(value) => setSelectedYear(value || String(new Date().getFullYear()))}
              data={yearOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Updated platforms grid with 2 columns and colored icons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Object.entries(selectedPlatforms).map(([platform, checked]) => (
            <label key={platform} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-100">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePlatform(platform)}
                className="form-checkbox h-5 w-5 text-blue-600 rounded"
              />
              <div className="flex items-center">
                {platform === 'Instagram' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="url(#instagram-gradient)"
                  >
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                  </svg>
                )}

                {platform === 'Facebook' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="#1877F2"
                  >
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951" />
                  </svg>
                )}

                {platform === 'Youtube' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="#FF0000"
                    viewBox="0 0 16 16"
                    className="bi bi-youtube"
                  >
                    <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z" />
                  </svg>
                )}

                {platform === 'Thread' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M6.321 6.016c-.27-.18-1.166-.802-1.166-.802.756-1.081 1.753-1.502 3.132-1.502.975 0 1.803.327 2.394.948s.928 1.509 1.005 2.644q.492.207.905.484c1.109.745 1.719 1.86 1.719 3.137 0 2.716-2.226 5.075-6.256 5.075C4.594 16 1 13.987 1 7.994 1 2.034 4.482 0 8.044 0 9.69 0 13.55.243 15 5.036l-1.36.353C12.516 1.974 10.163 1.43 8.006 1.43c-3.565 0-5.582 2.171-5.582 6.79 0 4.143 2.254 6.343 5.63 6.343 2.777 0 4.847-1.443 4.847-3.556 0-1.438-1.208-2.127-1.27-2.127-.236 1.234-.868 3.31-3.644 3.31-1.618 0-3.013-1.118-3.013-2.582 0-2.09 1.984-2.847 3.55-2.847.586 0 1.294.04 1.663.114 0-.637-.54-1.728-1.9-1.728-1.25 0-1.566.405-1.967.868ZM8.716 8.19c-2.04 0-2.304.87-2.304 1.416 0 .878 1.043 1.168 1.6 1.168 1.02 0 2.067-.282 2.232-2.423a6.2 6.2 0 0 0-1.528-.161" />
                  </svg>
                )}

                {platform === 'X' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="#000000"
                  >
                    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                  </svg>
                )}

                {platform === 'Pinterest' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="#E60023"
                  >
                    <path d="M8 0a8 8 0 0 0-2.915 15.452c-.07-.633-.134-1.606.027-2.297.146-.625.938-3.977.938-3.977s-.239-.479-.239-1.187c0-1.113.645-1.943 1.448-1.943.682 0 1.012.512 1.012 1.127 0 .686-.437 1.712-.663 2.663-.188.796.4 1.446 1.185 1.446 1.422 0 2.515-1.5 2.515-3.664 0-1.915-1.377-3.254-3.342-3.254-2.276 0-3.612 1.707-3.612 3.471 0 .688.265 1.425.595 1.826a.24.24 0 0 1 .056.23c-.061.252-.196.796-.222.907-.035.146-.116.177-.268.107-1-.465-1.624-1.926-1.624-3.1 0-2.523 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.811 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A8 8 0 1 0 8 0" />
                  </svg>
                )}

                {platform === 'LinkedIn' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="#0A66C2"
                  >
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
                  </svg>
                )}

             {platform === 'GBP' && (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 16 16"
    fill="#4285F4"
  >
    <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
  </svg>
)}

                {platform === 'Website' && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                  >
                    <defs>
                      <linearGradient id="website-multicolor" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285F4" />
                        <stop offset="25%" stopColor="#34A853" />
                        <stop offset="50%" stopColor="#FBBC05" />
                        <stop offset="75%" stopColor="#EA4335" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#website-multicolor)"
                      d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"
                    />
                  </svg>
                )}

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