import { FC, useCallback, useEffect, useState } from 'react';
import Loading from 'react-loading';
import { useFetch } from '@chaolaolo/helpers/utils/custom.fetch';
import { timer } from '@chaolaolo/helpers/utils/timer';
import { useToaster } from '@chaolaolo/react/toaster/toaster';
export const CheckPayment: FC<{
  check: string;
  mutate: () => void;
}> = (props) => {
  const [showLoader, setShowLoader] = useState(true);
  const fetch = useFetch();
  const toaster = useToaster();
  const checkSubscription = useCallback(async () => {
    const { status } = await (
      await fetch('/billing/check/' + props.check)
    ).json();
    if (status === 0) {
      await timer(1000);
      return checkSubscription();
    }
    if (status === 1) {
      toaster.show(
        'We could not validate your payment method, please try again',
        'warning'
      );
      setShowLoader(false);
    }
    if (status === 2) {
      setShowLoader(false);
      props.mutate();
    }
  }, []);
  useEffect(() => {
    checkSubscription();
  }, []);
  if (showLoader) {
    return (
      <div className="fixed bg-black/40 w-full h-full flex justify-center items-center z-[400]">
        <div>
          <Loading type="spin" color="#612AD5" height={250} width={250} />
        </div>
      </div>
    );
  }
  return null;
};
