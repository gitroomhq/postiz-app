import React, { FC } from 'react';
import { Button } from '@gitroom/react/form/button';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@mantine/modals';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useDebouncedCallback } from 'use-debounce';
import ReactLoading from 'react-loading';
import dayjs from 'dayjs';
import clsx from 'clsx';
import interClass from '@gitroom/react/helpers/inter.font';
import Prorate from './prorate.component';
import Features from './features.component';

interface PricingPlansProps {
    monthlyOrYearly: 'on' | 'off';
    currentPackage: string;
    subscription: Subscription | undefined;
    loading: boolean;
    moveToCheckout: (billing: 'STANDARD' | 'PRO' | 'FREE') => () => Promise<void>;
}

const PricingPlans: FC<PricingPlansProps> = ({
                                                 monthlyOrYearly,
                                                 currentPackage,
                                                 subscription,
                                                 loading,
                                                 moveToCheckout,
                                             }) => {
    const { isGeneral } = useVariables();

    return (
        <>
            {Object.entries(pricing)
                .filter((f) => !isGeneral || f[0] !== 'FREE')
                .map(([name, values]) => (
                    <div
                        key={name}
                        className="flex-1 bg-sixth border border-customColor6 rounded-[4px] p-[24px] gap-[16px] flex flex-col"
                    >
                        <div className="text-[18px]">{name}</div>
                        <div className="text-[38px] flex gap-[2px] items-center">
                            <div>
                                $
                                {monthlyOrYearly === 'on'
                                    ? values.year_price
                                    : values.month_price}
                            </div>
                            <div className={`text-[14px] ${interClass} text-customColor18`}>
                                {monthlyOrYearly === 'on' ? '/year' : '/month'}
                            </div>
                        </div>
                        <div className="text-[14px] flex gap-[10px]">
                            {currentPackage === name.toUpperCase() &&
                            subscription?.cancelAt ? (
                                <div className="gap-[3px] flex flex-col">
                                    <div>
                                        <Button
                                            onClick={moveToCheckout('FREE')}
                                            loading={loading}
                                        >
                                            Reactivate subscription
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    loading={loading}
                                    disabled={
                                        (!!subscription?.cancelAt &&
                                            name.toUpperCase() === 'FREE') ||
                                        currentPackage === name.toUpperCase()
                                    }
                                    className={clsx(
                                        subscription &&
                                        name.toUpperCase() === 'FREE' &&
                                        '!bg-red-500'
                                    )}
                                    onClick={moveToCheckout(
                                        name.toUpperCase() as 'STANDARD' | 'PRO'
                                    )}
                                >
                                    {currentPackage === name.toUpperCase()
                                        ? 'Current Plan'
                                        : name.toUpperCase() === 'FREE'
                                            ? subscription?.cancelAt
                                                ? `Downgrade on ${dayjs
                                                    .utc(subscription?.cancelAt)
                                                    .local()
                                                    .format('D MMM, YYYY')}`
                                                : 'Cancel subscription'
                                            : // @ts-ignore
                                            user?.tier === 'FREE' || user?.tier?.current === 'FREE'
                                                ? 'Start 7 days free trial'
                                                : 'Purchase'}
                                </Button>
                            )}
                            {subscription &&
                                currentPackage !== name.toUpperCase() &&
                                name !== 'FREE' &&
                                !!name && (
                                    <Prorate
                                        period={monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'}
                                        pack={name.toUpperCase() as 'STANDARD' | 'PRO'}
                                    />
                                )}
                        </div>
                        <Features
                            pack={name.toUpperCase() as 'FREE' | 'STANDARD' | 'PRO'}
                        />
                    </div>
                ))}
        </>
    );
};

export default PricingPlans;