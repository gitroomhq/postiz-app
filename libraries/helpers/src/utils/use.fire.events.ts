import { usePlausible } from 'next-plausible';
import { useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { usePostHog } from 'posthog-js/react';

export const useFireEvents = () => {
  const { billingEnabled } = useVariables();
  const plausible = usePlausible();
  const posthog = usePostHog();

  return useCallback((name: string, props?: any) => {
    if (!billingEnabled) {
      return;
    }

    posthog.capture(name, props);
    plausible(name, { props });
  }, []);
};
