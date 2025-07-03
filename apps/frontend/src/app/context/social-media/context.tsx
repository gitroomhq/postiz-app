"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SocialMediaConfig } from "./types";
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';


// Define the context type
interface SocialMediaContextType {
  socialMediaConfig: SocialMediaConfig[];
  setSocialMediaConfig: React.Dispatch<React.SetStateAction<SocialMediaConfig[]>>;
  updateSocialMediaConfig: (platform: string, updatedConfig: Partial<SocialMediaConfig> | any) => void; // Update method
  updateSocialMediaConfigListFromServer: (customerId: string) => Promise<void>; // New function to fetch config
}

// Create the context
const SocialMediaContext = createContext<SocialMediaContextType | undefined>(undefined);

// Initialize default configuration
const initializeDefaultConfig = (customerId: string): SocialMediaConfig[] => [
  {
    customerId: customerId,
    platform: "X",
    platformKey: "x",
    config: [
      {
        key: "X_API_KEY",
        value: "",
      },
      {
        key: "X_API_SECRET",
        value: "",
      },
      // {
      //   key: "X_CLIENT",
      //   value: "",
      // },
      // {
      //   key: "X_SECRET",
      //   value: "",
      // },
    ],
  },
  {
    customerId: customerId,
    platform: "LinkedIn",
    platformKey: "linkedin",
    config: [
      {
        key: "LINKEDIN_CLIENT_ID",
        value: "",
      },
      {
        key: "LINKEDIN_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "LinkedIn Page",
    platformKey: "linkedin-page",
    config: [
      {
        key: "LINKEDIN_CLIENT_ID",
        value: "",
      },
      {
        key: "LINKEDIN_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Github",
    platformKey: "github",
    config: [
      {
        key: "GITHUB_CLIENT_ID",
        value: "",
      },
      {
        key: "GITHUB_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Reddit",
    platformKey: "reddit",
    config: [
      {
        key: "REDDIT_CLIENT_ID",
        value: "",
      },
      {
        key: "REDDIT_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Threads",
    platformKey: "threads",
    config: [
      {
        key: "THREADS_APP_ID",
        value: "",
      },
      {
        key: "THREADS_APP_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Facebook",
    platformKey: "facebook",
    config: [
      {
        key: "FACEBOOK_APP_ID",
        value: "",
      },
      {
        key: "FACEBOOK_APP_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Instagram",
    platformKey: "instagram",
    config: [
      {
        key: "FACEBOOK_APP_ID",
        value: "",
      },
      {
        key: "FACEBOOK_APP_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Instagram (Standalone)",
    platformKey: "instagram-standalone",
    config: [
      {
        key: "INSTAGRAM_APP_ID",
        value: "",
      },
      {
        key: "INSTAGRAM_APP_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Youtube",
    platformKey: "youtube",
    config: [
      {
        key: "YOUTUBE_CLIENT_ID",
        value: "",
      },
      {
        key: "YOUTUBE_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Tictok",
    platformKey: "tictok",
    config: [
      {
        key: "TIKTOK_CLIENT_ID",
        value: "",
      },
      {
        key: "TIKTOK_CLIENT_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Slack",
    platformKey: "slack",
    config: [
      {
        key: "SLACK_ID",
        value: "",
      },
      {
        key: "SLACK_SECRET",
        value: "",
      },
      {
        key: "SLACK_SIGNING_SECRET",
        value: "",
      },
    ],
  },
  {
    customerId: customerId,
    platform: "Pinterest",
    platformKey: "pinterest",
    config: [
      {
        key: "PINTEREST_CLIENT_ID",
        value: "",
      },
      {
        key: "PINTEREST_CLIENT_SECRET",
        value: "",
      }
    ],
  },
  {
    customerId: customerId,
    platform: "Gbp",
    platformKey: "gbp",
    config: [
      {
        key: "GOOGLE_CLIENT_ID",
        value: "",
      },
      {
        key: "GOOGLE_CLIENT_SECRET",
        value: ""
      }
    ],
  },
  {
    customerId: customerId,
    platform: "Website",
    platformKey: "website",
    config: [
      {
        key: "GOOGLE_WEBSITE_CLIENT_ID",
        value: "",
      },
      {
        key: "GOOGLE_WEBSITE_CLIENT_SECRET",
        value: "",
      },
      {
        key: "GOOGLE_WEBSITE_PROPERTY_ID",
        value: "",
      },
    ],
  }
];

// Create the provider
export const SocialMediaProvider = ({ children }: { children: ReactNode }) => {

  const fetch = useFetch();

  const [socialMediaConfig, setSocialMediaConfig] = useState<SocialMediaConfig[]>([]);

  // Function to update specific platform's configuration
  const updateSocialMediaConfig = (platform: string, updatedConfig: Partial<SocialMediaConfig>) => {
    setSocialMediaConfig((prevConfig) =>
      prevConfig.map((config) => {
        if (config.platform === platform) {
          const updatedPlatform = { ...config, ...updatedConfig };

          // If updatedConfig contains a config array, update individual key-value pairs
          if (updatedConfig.config) {
            updatedPlatform.config = updatedPlatform.config.map((configItem) => {
              const updatedItem = updatedConfig.config?.find((item) => item.key === configItem.key);
              return updatedItem ? { ...configItem, value: updatedItem.value } : configItem;
            });
          }

          return updatedPlatform;
        }
        return config;
      })
    );
  };

  // Function to fetch and initialize social media config from backend API
  const updateSocialMediaConfigListFromServer = async (customerId: string) => {

    setSocialMediaConfig(initializeDefaultConfig(customerId));

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const apiUrl = `${backendUrl}/social-media-platform-config?customerId=${customerId}`; // Construct the full URL

      // Fetch data from the server
      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      // Check if the response is successful (status 200-299)
      if (response.ok) {
        const result: SocialMediaConfig[] = await response.json();

        // Update social media config with fetched data
        setSocialMediaConfig((prevConfig) =>
          prevConfig.map((config) => {
            const updatedPlatform = result.find((newConfig) => newConfig.platformKey === config.platformKey);

            // If the platform data exists in the fetched result, update it
            if (updatedPlatform) {
              return {
                ...config,
                config: config.config.map((configItem) => {
                  const updatedConfigItem = updatedPlatform.config.find(
                    (item) => item.key === configItem.key
                  );
                  return updatedConfigItem
                    ? { ...configItem, value: updatedConfigItem.value }
                    : configItem;
                }),
              };
            }

            // If no matching data, return the platform as it is
            return config;
          })
        );
      } else {
        // Handle non-200 response status codes
        console.error(`Failed to fetch social media config: ${response.statusText}`);
      }
    } catch (error) {
      // Log error if the fetch fails
      console.error("Failed to fetch social media config:", error);
    }
  };


  useEffect(() => {
  }, []);

  return (
    <SocialMediaContext.Provider value={{ socialMediaConfig, setSocialMediaConfig, updateSocialMediaConfig, updateSocialMediaConfigListFromServer }}>
      {children}
    </SocialMediaContext.Provider>
  );
};

// Custom hook to use the context
export const useSocialMedia = (): SocialMediaContextType => {
  const context = useContext(SocialMediaContext);
  if (!context) {
    throw new Error("useSocialMedia must be used within a SocialMediaProvider");
  }
  return context;
};
