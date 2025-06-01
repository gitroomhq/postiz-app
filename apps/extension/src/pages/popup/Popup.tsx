import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { ProviderList } from '@gitroom/extension/providers/provider.list';
import { fetchCookie } from '@gitroom/extension/utils/load.cookie';

export const PopupContainerContainer: FC = () => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      setUrl(tabs[0]?.url);
    });
  }, []);

  if (!url) {
    return (
      <div className="text-4xl">This website is not supported by Postiz</div>
    );
  }

  return <PopupContainer url={url} />;
};

export const PopupContainer: FC<{ url: string }> = (props) => {
  const { url } = props;
  const [isLoggedIn, setIsLoggedIn] = useState<false | string>(false);
  const [isLoading, setIsLoading] = useState(true);
  const provider = useMemo(() => {
    return ProviderList.find((p) => {
      return p.baseUrl.indexOf(new URL(url).hostname) > -1;
    });
  }, [url]);

  const loadCookie = useCallback(async () => {
    try {
      if (!provider) {
        setIsLoading(false);
        return;
      }
      const auth = await fetchCookie(`auth`);

      if (auth) {
        setIsLoggedIn(auth);
      }

      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCookie();
  }, []);

  if (isLoading) {
    return null;
  }

  if (!provider) {
    return (
      <div className="text-4xl">This website is not supported by Postiz</div>
    );
  }

  if (!isLoggedIn) {
    return <div className="text-4xl">You are not logged in to Postiz</div>;
  }

  return <div />;
};

export default function Popup() {
  return (
    <div className="flex justify-center items-center h-screen">
      <PopupContainerContainer />
    </div>
  );
}
