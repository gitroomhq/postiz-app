import { useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

const isKnownStorageHost = (hostname: string, storageHostname: string) => {
  return (
    hostname === storageHostname ||
    hostname.endsWith('.r2.cloudflarestorage.com') ||
    /(^|\.)s3([.-][a-z0-9-]+)?\.amazonaws\.com$/.test(hostname)
  );
};

export const useMediaDirectory = () => {
  const { storageProvider, cloudflareUrl } = useVariables();

  const set = useCallback((path: string) => {
    if (
      !path ||
      (storageProvider !== 'cloudflare' && storageProvider !== 's3') ||
      !cloudflareUrl
    ) {
      return path;
    }

    try {
      const currentUrl = new URL(path);
      const storageUrl = new URL(cloudflareUrl);
      if (!isKnownStorageHost(currentUrl.hostname, storageUrl.hostname)) {
        return path;
      }
      currentUrl.protocol = storageUrl.protocol;
      currentUrl.host = storageUrl.host;
      return currentUrl.toString();
    } catch {
      return path;
    }
  }, [cloudflareUrl, storageProvider]);

  return {
    set,
  };
};
