'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useSearchParams } from 'next/navigation';
import { OrganizationSelector } from '@gitroom/frontend/components/layout/organization.selector';
import { LanguageComponent } from '@gitroom/frontend/components/layout/language.component';
import { AttachToFeedbackIcon } from '@gitroom/frontend/components/new-layout/sentry.feedback.component';
import NotificationComponent from '@gitroom/frontend/components/notifications/notification.component';
import dynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { capitalize } from 'lodash';
import clsx from 'clsx';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { CheckIconComponent } from '@gitroom/frontend/components/ui/check.icon.component';
import {
  FAQComponent,
  FAQSection,
} from '@gitroom/frontend/components/billing/faq.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';

const ModeComponent = dynamic(
  () => import('@gitroom/frontend/components/layout/mode.component'),
  {
    ssr: false,
  }
);

const EmbeddedBilling = dynamic(
  () =>
    import('@gitroom/frontend/components/billing/embedded.billing').then(
      (mod) => mod.EmbeddedBilling
    ),
  {
    ssr: false,
  }
);

export const FirstBillingComponent = () => {
  const { stripeClient } = useVariables();
  const user = useUser();
  const dub = useDubClickId();
  const [stripe, setStripe] = useState<null | Promise<Stripe>>(null);
  const [tier, setTier] = useState('STANDARD');
  const [period, setPeriod] = useState('MONTHLY');
  const fetch = useFetch();
  const t = useT();

  useEffect(() => {
    setStripe(loadStripe(stripeClient));
  }, []);

  const loadCheckout = useCallback(async () => {
    return (
      await fetch('/billing/embedded', {
        method: 'POST',
        body: JSON.stringify({
          billing: tier,
          period: period,
          ...(dub ? { dub } : {}),
        }),
      })
    ).json();
  }, [tier, period]);

  const { data, isLoading } = useSWR(
    `/billing-${tier}-${period}`,
    loadCheckout,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  const price = useMemo(
    () => Object.entries(pricing).filter(([key, value]) => key !== 'FREE'),
    []
  );

  const JoinOver = () => {
    return (
      <>
        <div className="text-[46px] font-[600] leading-[110%] tablet:text-[36px] mobile:!text-[30px] whitespace-pre-line text-balance">
          {t('billing_join_over', 'Join Over')}{' '}
          <span className="text-[#FC69FF]">
            {t('billing_entrepreneurs_count', '18,000+ Entrepreneurs')}
          </span>{' '}
          {t('billing_who_use', 'who use')}{' '}
          {t(
            'billing_postiz_grow_social',
            'Postiz To Grow Their Social Presence'
          )}
        </div>

        {!!user?.allowTrial && (
          <div className="flex mt-[32px] mb-[10px] gap-[15px] tablet:mt-[32px] tablet:mb-[32px] text-[16px] font-[500] mobile:flex-col">
            <div className="flex gap-[8px]">
              <div>
                <CheckIconComponent />
              </div>
              <div>{t('billing_no_risk_trial', '100% No-Risk Free Trial')}</div>
            </div>
            <div className="flex-1 flex gap-[8px] justify-center mobile:justify-start">
              <div>
                <CheckIconComponent />
              </div>
              <div>
                {t(
                  'billing_pay_nothing_7_days',
                  'Pay NOTHING for the first 7-days'
                )}
              </div>
            </div>
            <div className="flex gap-[8px]">
              <div>
                <CheckIconComponent />
              </div>
              <div>
                {t('billing_cancel_anytime', 'Cancel anytime, hassle-free')}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="blurMe flex flex-1 flex-col bg-newBgColorInner pb-[60px] mobile:pb-[100px]">
      <div className="h-[92px] px-[80px] tablet:px-[32px] mobile:!px-[16px] py-[20px] flex border-b border-newColColor">
        <div className="flex-1 flex items-center text-textColor">
          <LogoTextComponent />
        </div>
        <div className="flex items-center">
          <div className="flex gap-[20px] text-textItemBlur">
            <OrganizationSelector />
            <div className="hover:text-newTextColor">
              <ModeComponent />
            </div>
            <div className="w-[1px] h-[20px] bg-blockSeparator" />
            <LanguageComponent />
            <div className="w-[1px] h-[20px] bg-blockSeparator" />
            <AttachToFeedbackIcon />
            <NotificationComponent />
          </div>
        </div>
      </div>
      <div className="flex px-[80px] tablet:px-[32px] mobile:!px-[16px] flex-1 flex-row tablet:flex-none tablet:flex-col-reverse">
        <div className="flex-1 py-[40px] tablet:pt-[80px] flex flex-col pe-[40px] tablet:pe-0">
          <div className="block tablet:hidden">
            <JoinOver />
          </div>
          {!isLoading && data && stripe ? (
            <>
              <EmbeddedBilling stripe={stripe} secret={data.client_secret} />
              <FAQComponent />
            </>
          ) : (
            <LoadingComponent />
          )}
        </div>
        <div className="flex flex-col ps-[40px] tablet:!ps-[0] border-l border-newColColor py-[40px] mobile:!pt-[24px] tablet:border-none tablet:pb-0">
          <div className="top-[20px] sticky">
            <div className="hidden tablet:block">
              <JoinOver />
            </div>
            <div className="flex mb-[24px] mobile:flex-col">
              <div className="flex-1 text-[24px] font-[700]">
                {t('billing_choose_plan', 'Choose a Plan')}
              </div>
              <div className="h-[44px] px-[6px] mobile:px-0 flex items-center justify-center mobile:justify-start gap-[12px] border border-newColColor rounded-[12px] select-none">
                <div
                  className={clsx(
                    'h-[32px] mobile:flex-1 rounded-[6px] text-[16px] px-[12px] flex justify-center items-center',
                    period === 'MONTHLY'
                      ? 'bg-boxFocused text-textItemFocused'
                      : 'cursor-pointer'
                  )}
                  onClick={() => setPeriod('MONTHLY')}
                >
                  {t('billing_monthly', 'Monthly')}
                </div>
                <div
                  className={clsx(
                    'gap-[10px] h-[32px] mobile:flex-1 rounded-[6px] text-[16px] px-[12px] flex justify-center items-center',
                    period === 'YEARLY'
                      ? 'bg-boxFocused text-textItemFocused'
                      : 'cursor-pointer'
                  )}
                  onClick={() => setPeriod('YEARLY')}
                >
                  <div>{t('billing_yearly', 'Yearly')}</div>
                  <div className="bg-[#AA0FA4] text-[white] px-[8px] rounded-[4px] mobile:hidden">
                    {t('billing_20_percent_off', '20% Off')}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[8px] mobile:!grid-cols-2 tablet:grid-cols-4">
              {price.map(
                ([key, value]) => (
                  <div
                    onClick={() => setTier(key)}
                    key={key}
                    className={clsx(
                      'cursor-pointer select-none w-[266px] h-[138px] tablet:w-full tablet:h-[124px] p-[24px] tablet:p-[15px] rounded-[20px] flex flex-col',
                      key === tier
                        ? 'border-[1.5px] border-[#618DFF]'
                        : 'border-[1.5px] border-newColColor'
                    )}
                  >
                    <div className="text-[20px] mobile:text-[18px] font-[500]">
                      {capitalize(key)}
                    </div>
                    <div className="text-[24px] mobile:text-[18px] font-[400]">
                      <span className="text-[44px] mobile:text-[30px] font-[600]">
                        $
                        {
                          value[
                            period === 'MONTHLY' ? 'month_price' : 'year_price'
                          ]
                        }
                      </span>{' '}
                      {period === 'MONTHLY'
                        ? t('billing_per_month', '/ month')
                        : t('billing_per_year', '/ year')}
                    </div>
                  </div>
                ),
                []
              )}
            </div>
            <div className="flex flex-col mt-[54px] gap-[24px] tablet:mt-[40px]">
              <div className="text-[24px] font-[700]">
                {t('billing_features', 'Features')}
              </div>
              <BillingFeatures tier={tier} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type FeatureItem = {
  key: string;
  defaultValue: string;
  prefix?: string | number;
};

export const BillingFeatures: FC<{ tier: string }> = ({ tier }) => {
  const t = useT();
  const features = useMemo(() => {
    const currentPricing = pricing[tier];
    const channelsOr = currentPricing.channel;
    const list: FeatureItem[] = [];

    list.push({
      key: channelsOr === 1 ? 'billing_channel' : 'billing_channels',
      defaultValue: channelsOr === 1 ? 'channel' : 'channels',
      prefix: channelsOr,
    });

    list.push({
      key: 'billing_posts_per_month',
      defaultValue: 'posts per month',
      prefix:
        currentPricing.posts_per_month > 10000
          ? 'unlimited'
          : currentPricing.posts_per_month,
    });

    if (currentPricing.team_members) {
      list.push({
        key: 'billing_unlimited_team_members',
        defaultValue: 'Unlimited team members',
      });
    }
    if (currentPricing?.ai) {
      list.push({
        key: 'billing_ai_auto_complete',
        defaultValue: 'AI auto-complete',
      });
      list.push({ key: 'billing_ai_copilots', defaultValue: 'AI copilots' });
      list.push({
        key: 'billing_ai_autocomplete',
        defaultValue: 'AI Autocomplete',
      });
    }
    list.push({
      key: 'billing_advanced_picture_editor',
      defaultValue: 'Advanced Picture Editor',
    });
    if (currentPricing?.image_generator) {
      list.push({
        key: 'billing_ai_images_per_month',
        defaultValue: 'AI Images per month',
        prefix: currentPricing?.image_generation_count,
      });
    }
    if (currentPricing?.generate_videos) {
      list.push({
        key: 'billing_ai_videos_per_month',
        defaultValue: 'AI Videos per month',
        prefix: currentPricing?.generate_videos,
      });
    }
    return list;
  }, [tier]);

  const renderFeature = (feature: FeatureItem) => {
    const translatedText = t(feature.key, feature.defaultValue);
    if (feature.prefix === 'unlimited') {
      return `${t('billing_unlimited', 'Unlimited')} ${translatedText}`;
    }
    if (feature.prefix !== undefined) {
      return `${feature.prefix} ${translatedText}`;
    }
    return translatedText;
  };

  return (
    <div className="grid grid-cols-2 mobile:grid-cols-1 gap-y-[8px] gap-x-[32px]">
      {features.map((feature) => (
        <div key={feature.key} className="flex items-center gap-[8px]">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
            >
              <path
                d="M11.825 0H4.84167C1.80833 0 0 1.80833 0 4.84167V11.8167C0 14.8583 1.80833 16.6667 4.84167 16.6667H11.8167C14.85 16.6667 16.6583 14.8583 16.6583 11.825V4.84167C16.6667 1.80833 14.8583 0 11.825 0ZM12.3167 6.41667L7.59167 11.1417C7.475 11.2583 7.31667 11.325 7.15 11.325C6.98333 11.325 6.825 11.2583 6.70833 11.1417L4.35 8.78333C4.10833 8.54167 4.10833 8.14167 4.35 7.9C4.59167 7.65833 4.99167 7.65833 5.23333 7.9L7.15 9.81667L11.4333 5.53333C11.675 5.29167 12.075 5.29167 12.3167 5.53333C12.5583 5.775 12.5583 6.16667 12.3167 6.41667Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>{renderFeature(feature)}</div>
        </div>
      ))}
    </div>
  );
};
