import { FC, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Loading from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { timer } from '@gitroom/helpers/utils/timer';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useDecisionModal } from '@gitroom/frontend/components/layout/new-modal';
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
  const [showLoader, setShowLoader] = useState(true);
  const fetch = useFetch();
  const toaster = useToaster();
  const modal = useDecisionModal();

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
        title: 'Invalid Payment',
        onlyApprove: true,
        approveLabel: 'OK',
        description:
          'We could not validate your payment method, please try again',
      });
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
  return props.children;
};

export const ChannelsAfterPayment: FC<{
  integrations: { disabled: boolean }[];
}> = ({ integrations }) => {
  const check = useSearchParams().get('check');
  const fetch = useFetch();
  const modal = useDecisionModal();
  const t = useT();
  const shown = useRef(false);

  useEffect(() => {
    if (!check || shown.current || !integrations?.length) {
      return;
    }
    shown.current = true;
    (async () => {
      const { status } = await (await fetch('/billing/check/' + check)).json();
      if (status !== 2) {
        return;
      }
      if (integrations.some((p) => p.disabled)) {
        modal.open({
          title: t('channels_still_disabled', 'Your channels are disabled'),
          onlyApprove: true,
          approveLabel: t('ok', 'OK'),
          description: t(
            'channels_still_disabled_description',
            "Your plan doesn't cover all of your connected channels, so they stay disabled. Enable the ones you want from each channel's menu, up to your plan's limit, or upgrade your plan to enable all of them."
          ),
        });
        return;
      }
      modal.open({
        title: t('channels_enabled_again', 'Your channels are enabled'),
        onlyApprove: true,
        approveLabel: t('ok', 'OK'),
        description: t(
          'channels_enabled_again_description',
          'All of your connected channels were enabled again and are ready to publish.'
        ),
      });
    })();
  }, [check, integrations]);

  return null;
};
