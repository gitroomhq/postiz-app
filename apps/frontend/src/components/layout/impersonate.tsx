import { Input } from '@gitroom/react/form/input';
import { ChangeEventHandler, FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Select } from '@gitroom/react/form/select';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';

interface Charge {
  id: string;
  amount: number;
  currency: string;
  created: number;
  status: string;
  refunded: boolean;
  amount_refunded: number;
  description: string | null;
}

const useCharges = () => {
  const fetch = useFetch();
  return useSWR<Charge[]>('/billing/charges', async () => {
    return (await fetch('/billing/charges')).json();
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  });
};

const ChargesModal: FC<{ close: () => void }> = ({ close }) => {
  const fetch = useFetch();
  const t = useT();
  const { data: charges, mutate } = useCharges();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refunding, setRefunding] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const toggleCharge = useCallback((chargeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chargeId)) {
        next.delete(chargeId);
      } else {
        next.add(chargeId);
      }
      return next;
    });
  }, []);

  const handleRefund = useCallback(async () => {
    if (!selected.size) return;
    if (
      !(await deleteDialog(
        t(
          'refund_selected_confirm',
          `Are you sure you want to refund ${selected.size} charge(s)? This cannot be undone.`
        ),
        t('yes_refund', 'Yes, refund'),
        t('confirm_refund', 'Confirm Refund'),
        t('no_cancel', 'No, cancel')
      ))
    ) {
      return;
    }
    setRefunding(true);
    try {
      await fetch('/billing/refund-charges', {
        method: 'POST',
        body: JSON.stringify({ chargeIds: Array.from(selected) }),
      });
      setSelected(new Set());
      await mutate();
    } finally {
      setRefunding(false);
    }
  }, [selected]);

  const handleCancel = useCallback(async () => {
    if (
      !(await deleteDialog(
        t(
          'cancel_subscription_confirm',
          'This will immediately cancel the subscription. The user will be downgraded to the FREE plan. This cannot be undone.'
        ),
        t('yes_cancel_subscription', 'Yes, cancel subscription'),
        t('cancel_subscription_title', 'Cancel Subscription?'),
        t('no_go_back', 'No, go back')
      ))
    ) {
      return;
    }
    setCancelling(true);
    try {
      await fetch('/billing/cancel-subscription', {
        method: 'POST',
      });
      close();
      window.location.reload();
    } catch {
      setCancelling(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-[16px] min-w-[500px]">
      <div className="max-h-[400px] overflow-y-auto">
        {!charges?.length ? (
          <div className="text-center py-[20px] text-newTextColor/60">
            {t('no_charges', 'No charges found')}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-newTableBorder">
                <th className="p-[8px] w-[40px]" />
                <th className="p-[8px]">{t('date', 'Date')}</th>
                <th className="p-[8px]">{t('amount', 'Amount')}</th>
                <th className="p-[8px]">{t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr
                  key={charge.id}
                  className="border-b border-newTableBorder hover:bg-tableBorder cursor-pointer"
                  onClick={() => !charge.refunded && toggleCharge(charge.id)}
                >
                  <td className="p-[8px]">
                    <div
                      className={`w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center ${
                        charge.refunded
                          ? 'border-newTextColor/20 opacity-40'
                          : selected.has(charge.id)
                          ? 'bg-forth border-forth'
                          : 'border-newTextColor/40'
                      }`}
                    >
                      {(selected.has(charge.id) || charge.refunded) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="p-[8px]">
                    {new Date(charge.created * 1000).toLocaleDateString()}
                  </td>
                  <td className="p-[8px]">
                    ${(charge.amount / 100).toFixed(2)}{' '}
                    {charge.currency.toUpperCase()}
                  </td>
                  <td className="p-[8px]">
                    {charge.refunded ? (
                      <span className="text-red-400">
                        {t('refunded', 'Refunded')}
                      </span>
                    ) : (
                      <span className="text-green-400">
                        {t('paid', 'Paid')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex gap-[12px] justify-end">
        <Button
          onClick={handleRefund}
          loading={refunding}
          disabled={!selected.size}
          className="rounded-[4px]"
        >
          {t('refund_selected', 'Refund Selected')}
          {selected.size > 0 && ` (${selected.size})`}
        </Button>
        <Button
          onClick={handleCancel}
          loading={cancelling}
          className="!bg-red-700 rounded-[4px]"
        >
          {t('cancel_subscription', 'Cancel Subscription')}
        </Button>
      </div>
    </div>
  );
};

const ManageBilling = () => {
  const { openModal } = useModals();
  const t = useT();

  const handleClick = useCallback(() => {
    openModal({
      title: t('manage_billing', 'Manage Billing'),
      children: (close) => <ChargesModal close={close} />,
    });
  }, []);

  return (
    <div
      className="px-[10px] rounded-[4px] bg-red-700 text-white cursor-pointer whitespace-nowrap"
      onClick={handleClick}
    >
      {t('manage_billing', 'Manage Billing')}
    </div>
  );
};

export const Subscription = () => {
  const fetch = useFetch();
  const t = useT();

  const addSubscription: ChangeEventHandler<HTMLSelectElement> = useCallback(
    async (e) => {
      const value = e.target.value;
      if (
        await deleteDialog(
          'Are you sure you want to add a user subscription?',
          'Add'
        )
      ) {
        await fetch('/billing/add-subscription', {
          method: 'POST',
          body: JSON.stringify({
            subscription: value,
          }),
        });
        window.location.reload();
      }
    },
    []
  );
  return (
    <Select
      onChange={addSubscription}
      hideErrors={true}
      disableForm={true}
      name="sub"
      label=""
      value=""
    >
      <option>
        {t('add_free_subscription', '-- ADD FREE SUBSCRIPTION --')}
      </option>
      {Object.keys(pricing)
        .filter((f) => !f.includes('FREE'))
        .map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
    </Select>
  );
};
export const Impersonate = () => {
  const fetch = useFetch();
  const [name, setName] = useState('');
  const { isSecured, billingEnabled } = useVariables();
  const user = useUser();
  const load = useCallback(async () => {
    if (!name) {
      return [];
    }
    const value = await (await fetch(`/user/impersonate?name=${name}`)).json();
    return value;
  }, [name]);
  const stopImpersonating = useCallback(async () => {
    if (!isSecured) {
      setCookie('impersonate', '', -10);
    } else {
      await fetch(`/user/impersonate`, {
        method: 'POST',
        body: JSON.stringify({
          id: '',
        }),
      });
    }
    window.location.reload();
  }, []);
  const t = useT();

  const setUser = useCallback(
    (userId: string) => async () => {
      await fetch(`/user/impersonate`, {
        method: 'POST',
        body: JSON.stringify({
          id: userId,
        }),
      });
      window.location.reload();
    },
    []
  );
  const { data } = useSWR(`/impersonate-${name}`, load, {
    refreshWhenHidden: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    revalidateIfStale: false,
    refreshInterval: 0,
  });
  const mapData = useMemo(() => {
    return data?.map(
      (curr: any) => ({
        id: curr.id,
        name: curr.user.name,
        email: curr.user.email,
      }),
      []
    );
  }, [data]);
  return (
    <div>
      <div className="bg-forth h-[52px] flex justify-center items-center border-input border rounded-[8px] text-white">
        <div className="relative flex flex-col w-[600px]">
          <div className="relative z-[999]">
            {user?.impersonate ? (
              <div className="text-center flex justify-center items-center gap-[20px]">
                <div>
                  {t('currently_impersonating', 'Currently Impersonating')}
                </div>
                <div>
                  <div
                    className="px-[10px] rounded-[4px] bg-red-500 text-white cursor-pointer"
                    onClick={stopImpersonating}
                  >
                    X
                  </div>
                </div>
                {user?.tier?.current === 'FREE' && <Subscription />}
                {billingEnabled && <ManageBilling />}
              </div>
            ) : (
              <Input
                autoComplete="off"
                placeholder="Write the user details"
                name="impersonate"
                disableForm={true}
                label=""
                removeError={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </div>
          {!!data?.length && (
            <>
              <div
                className="bg-primary/80 fixed start-0 top-0 w-full h-full z-[998]"
                onClick={() => setName('')}
              />
              <div className="absolute top-[100%] w-full start-0 bg-sixth border border-customColor6 text-textColor z-[999]">
                {mapData?.map((user: any) => (
                  <div
                    onClick={setUser(user.id)}
                    key={user.id}
                    className="p-[10px] border-b border-customColor6 hover:bg-tableBorder cursor-pointer"
                  >
                    {t('user_1', 'user:')}
                    {user.id.split('-').at(-1)} - {user.name} - {user.email}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
