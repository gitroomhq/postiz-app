import { useCallback } from 'react';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@mantine/modals';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSWRConfig } from 'swr';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

export const useMoveToCheckout = (
    subscription,
    setSubscription,
    setLoading,
    monthlyOrYearly,
    utm,
    user,
    mutate
) => {
    const toast = useToaster();
    const modal = useModals();
    const fetch = useFetch();
    const router = useRouter();

    return useCallback(
        (billing: 'STANDARD' | 'PRO' | 'FREE') => async () => {
            const messages = [];

            if (
                !pricing[billing].team_members &&
                pricing[subscription?.subscriptionTier!]?.team_members
            ) {
                messages.push(
                    `Your team members will be removed from your organization`
                );
            }

            if (billing === 'FREE') {
                if (
                    subscription?.cancelAt ||
                    (await deleteDialog(
                        `Are you sure you want to cancel your subscription? ${messages.join(
                            ', '
                        )}`,
                        'Yes, cancel',
                        'Cancel Subscription'
                    ))
                ) {
                    const info = await new Promise((res) => {
                        modal.openModal({
                            title: '',
                            withCloseButton: false,
                            classNames: {
                                modal: 'bg-transparent text-textColor',
                            },
                            children: <Info proceed={(e) => res(e)} />,
                        size: 'auto',
                    });
                    });

                    setLoading(true);
                    const { cancel_at } = await (
                        await fetch('/billing/cancel', {
                            method: 'POST',
                            body: JSON.stringify({
                                feedback: info,
                            }),
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })
                    ).json();

                    setSubscription((subs) => ({ ...subs!, cancelAt: cancel_at }));
                    if (cancel_at)
                        toast.show('Subscription set to canceled successfully');
                    if (!cancel_at) toast.show('Subscription reactivated successfully');

                    setLoading(false);
                }
                return;
            }

            if (
                messages.length &&
                !(await deleteDialog(messages.join(', '), 'Yes, continue'))
            ) {
                return;
            }

            setLoading(true);
            const { url, portal } = await (
                await fetch('/billing/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({
                        period: monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY',
                        utm,
                        billing,
                    }),
                })
            ).json();

            if (url) {
                window.location.href = url;
                return;
            }

            if (portal) {
                if (
                    await deleteDialog(
                        'We could not charge your credit card, please update your payment method',
                        'Update',
                        'Payment Method Required'
                    )
                ) {
                    window.open(portal);
                }
            } else {
                setPeriod(monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY');
                setSubscription((subs) => ({
                    ...subs!,
                    subscriptionTier: billing,
                    cancelAt: null,
                }));
                mutate(
                    '/user/self',
                    {
                        ...user,
                        tier: billing,
                    },
                    {
                        revalidate: false,
                    }
                );
                toast.show('Subscription updated successfully');
            }

            setLoading(false);
        },
        [monthlyOrYearly, subscription, user, utm]
    );
};