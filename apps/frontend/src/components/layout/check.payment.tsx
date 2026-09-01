import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
import { useRouter } from 'next/navigation';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const CheckPayment: FC<{
  check: string;
  mutate: () => void;
  children: ReactNode;
}> = (props) => {
  if (!props.check) {
    return <>{props.children}</>;
  }
  return <CheckPaymentInner {...props} />;
};

export const CheckPaymentInner: FC<{
  check: string;
  mutate: () => void;
  children: ReactNode;
}> = (props) => {
  const t = useT();
  const [showLoader, setShowLoader] = useState(true);
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useDecisionModal();
  const router = useRouter();

  useEffect(() => {
    if (showLoader) {
      document.querySelector('body')?.classList.add('overflow-hidden');
      Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
        p.classList.add('blur-xs', 'pointer-events-none')
      );
    } else {
      document.querySelector('body')?.classList.remove('overflow-hidden');
      Array.from(document.querySelectorAll('.blurMe') || []).map((p) =>
        p.classList.remove('blur-xs', 'pointer-events-none')
      );
    }
  }, [showLoader]);

  const checkSubscription = useCallback(async () => {
    const { status } = await (
      await fetch('/billing/check/' + props.check)
    ).json();
    if (status === 0) {
      await timer(1000);
      return checkSubscription();
    }
    if (status === 1) {
      modal.open({
        title: t('invalid_payment', 'Invalid Payment'),
        onlyApprove: true,
        approveLabel: t('ok', 'OK'),
        description: t(
          'we_could_not_validate_your_payment_method',
          'We could not validate your payment method, please try again'
        ),
      });
      setShowLoader(false);
    }
    if (status === 2) {
      setShowLoader(false);
      props.mutate();

      // Drop `check` from the URL so a later reload/org switch doesn't
      // re-poll the same payment id against whatever org is then selected
      const url = new URL(window.location.href);
      url.searchParams.delete('check');
      router.push(url.toString());
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
  return props.children;
};
