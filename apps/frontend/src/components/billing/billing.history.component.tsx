'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { capitalize } from 'lodash';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Select } from '@gitroom/react/form/select';

interface Invoice {
  id: string;
  number: string | null;
  tier: string | null;
  period: string | null;
  description: string | null;
  amount: number;
  currency: string;
  created: number;
  periodEnd: number;
  status: 'paid' | 'pending' | 'failed' | 'void';
  downloadUrl: string | null;
  viewUrl: string | null;
}

const PAGE_SIZE = 10;

const useInvoices = () => {
  const fetch = useFetch();
  return useSWR<Invoice[]>(
    '/billing/invoices',
    async () => {
      const response = await fetch('/billing/invoices');
      if (!response.ok) {
        throw new Error('Failed to load invoices');
      }
      return response.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
};

const formatAmount = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return formatter.format(
    amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2)
  );
};

const formatDate = (unix: number | null) =>
  unix
    ? dayjs
        .utc(unix * 1000)
        .local()
        .format('D MMM, YYYY')
    : '';

const ActionLink: FC<{
  href: string;
  label: string;
  icon: React.ReactNode;
}> = ({ href, label, icon }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    data-tooltip-id="tooltip"
    data-tooltip-content={label}
    className="w-[36px] h-[36px] rounded-[8px] border border-newTableBorder flex items-center justify-center text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
  >
    {icon}
  </a>
);

export const BillingHistory: FC = () => {
  const t = useT();
  const { data, isLoading, error } = useInvoices();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const statuses = useMemo(
    () =>
      ({
        paid: {
          label: t('billing_status_paid', 'Paid'),
          color: 'text-[#32D583]',
        },
        pending: {
          label: t('billing_status_open', 'Pending'),
          color: 'text-[#FFAC30]',
        },
        failed: {
          label: t('billing_status_failed', 'Failed'),
          color: 'text-[#F97066]',
        },
        void: {
          label: t('billing_status_void', 'Void'),
          color: 'text-textItemBlur',
        },
      } as Record<Invoice['status'], { label: string; color: string }>),
    [t]
  );

  const rows = useMemo(
    () =>
      (data || []).map((invoice) => ({
        ...invoice,
        plan: invoice.tier
          ? capitalize(invoice.tier)
          : invoice.description || t('billing_subscription', 'Subscription'),
        periodLabel:
          invoice.period === 'YEARLY'
            ? t('billing_yearly', 'Yearly')
            : invoice.period === 'MONTHLY'
            ? t('billing_monthly', 'Monthly')
            : '',
        amountLabel: formatAmount(invoice.amount, invoice.currency),
        purchaseDate: formatDate(invoice.created),
        endDate: formatDate(invoice.periodEnd),
        statusInfo: statuses[invoice.status] || statuses.void,
      })),
    [data, statuses, t]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (status === 'all' || row.status === status) &&
        (!query ||
          [
            row.plan,
            row.periodLabel,
            row.number,
            row.amountLabel,
            row.purchaseDate,
            row.endDate,
            row.statusInfo.label,
          ].some((value) => value?.toLowerCase().includes(query)))
    );
  }, [rows, search, status]);

  const exportCsv = useCallback(() => {
    const escape = (value: string | null) =>
      `"${(value || '').replace(/"/g, '""')}"`;
    const lines = [
      [
        t('billing_plan', 'Plan'),
        t('billing_amount', 'Amount'),
        t('billing_purchase_date', 'Purchase Date'),
        t('billing_end_date', 'End Date'),
        t('billing_status', 'Status'),
        t('billing_invoice', 'Invoice'),
      ],
      ...filtered.map((row) => [
        [row.plan, row.periodLabel].filter((p) => p).join(' - '),
        row.amountLabel,
        row.purchaseDate,
        row.endDate,
        row.statusInfo.label,
        row.viewUrl || row.downloadUrl || row.number,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + lines.map((line) => line.map(escape).join(',')).join('\n')],
        { type: 'text/csv;charset=utf-8' }
      )
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'billing-history.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [filtered, t]);

  const columns =
    'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_88px] gap-x-[16px] items-center px-[16px]';

  if (isLoading || (!error && !rows.length)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[20px] rounded-[12px] border border-newTableBorder bg-newBgColorInner shadow-previewShadow p-[24px] mobile:p-[16px]">
      <div className="flex items-center gap-[12px] mobile:flex-col mobile:items-stretch">
        <div className="flex-1 text-[20px] font-[600]">
          {t('billing_history', 'Billing History')}
        </div>
        <div className="flex items-center gap-[8px] mobile:flex-wrap">
          <div className="relative w-[240px] mobile:w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute start-[12px] top-1/2 -translate-y-1/2 text-textItemBlur pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20L16.5 16.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder={t('billing_search', 'Search...')}
              className="w-full h-[42px] ps-[38px] pe-[12px] rounded-[8px] bg-newBgColorInner border border-newTableBorder text-[14px] outline-none focus:border-[#612BD3]"
            />
          </div>
          <div className="mobile:flex-1">
            <Select
              label=""
              name="status"
              disableForm={true}
              hideErrors={true}
              value={status}
              className="w-full"
              onChange={(e) => {
                setStatus(e.target.value);
                setVisible(PAGE_SIZE);
              }}
            >
              <option value="all">
                {t('billing_all_statuses', 'All statuses')}
              </option>
              {Object.entries(statuses).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filtered.length}
            className="h-[42px] px-[16px] rounded-[8px] border border-newTableBorder bg-newBgColorInner flex items-center gap-[8px] text-[14px] font-[500] hover:bg-boxHover transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t('billing_export', 'Export')}
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <div
          className={clsx(
            columns,
            'h-[48px] rounded-[8px] border border-newTableBorder bg-newTableHeader text-[14px] text-newTableText mobile:hidden'
          )}
        >
          <div>{t('billing_plan', 'Plan')}</div>
          <div>{t('billing_amount', 'Amount')}</div>
          <div>{t('billing_purchase_date', 'Purchase Date')}</div>
          <div>{t('billing_end_date', 'End Date')}</div>
          <div>{t('billing_status', 'Status')}</div>
          <div>{t('billing_action', 'Action')}</div>
        </div>

        {error || !filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-[12px] py-[40px] px-[16px] text-center">
            <div className="w-[48px] h-[48px] rounded-full bg-[#612bd3]/10 flex items-center justify-center text-[#612bd3]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 3h16v18l-3-2-3 2-2-2-2 2-3-2-3 2V3z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </div>
            <div className="text-[15px] text-newTableText">
              {error
                ? t('billing_invoices_failed', 'Could not load your invoices')
                : t(
                    'billing_no_matching_invoices',
                    'No invoices match your search'
                  )}
            </div>
          </div>
        ) : (
          filtered.slice(0, visible).map((row) => (
            <div
              key={row.id}
              className={clsx(
                columns,
                'min-h-[64px] py-[12px] border-b border-newTableBorder last:border-b-0 text-[14px] mobile:grid-cols-[minmax(0,1fr)_auto] mobile:gap-y-[6px] mobile:py-[14px] mobile:px-0'
              )}
            >
              <div className="flex flex-col min-w-0 mobile:col-start-1 mobile:row-start-1">
                <div className="text-[15px] font-[500] truncate">
                  {row.plan}
                </div>
                {(!!row.periodLabel || !!row.number) && (
                  <div className="text-[13px] text-textItemBlur truncate">
                    {[row.periodLabel, row.number].filter((p) => p).join(' · ')}
                  </div>
                )}
              </div>
              <div className="font-[500] mobile:col-start-2 mobile:row-start-1 mobile:text-end">
                {row.amountLabel}
              </div>
              <div className="mobile:col-start-1 mobile:row-start-2 mobile:text-[13px] mobile:text-textItemBlur">
                <bdi>{row.purchaseDate}</bdi>
                {!!row.endDate && (
                  <span className="hidden mobile:inline">
                    {' - '}
                    <bdi>{row.endDate}</bdi>
                  </span>
                )}
              </div>
              <div className="mobile:hidden">
                <bdi>{row.endDate}</bdi>
              </div>
              <div
                className={clsx(
                  'flex items-center gap-[8px] font-[500] mobile:col-start-2 mobile:row-start-2 mobile:justify-end',
                  row.statusInfo.color
                )}
              >
                <span className="w-[8px] h-[8px] rounded-full bg-current shrink-0" />
                {row.statusInfo.label}
              </div>
              <div className="flex items-center gap-[8px] mobile:col-span-2 mobile:row-start-3">
                {!row.downloadUrl ? (
                  <div className="w-[36px] mobile:hidden" />
                ) : (
                  <ActionLink
                    href={row.downloadUrl}
                    label={t('billing_download_invoice', 'Download invoice')}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    }
                  />
                )}
                {!!row.viewUrl && (
                  <ActionLink
                    href={row.viewUrl}
                    label={t('billing_view_invoice', 'View invoice')}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {filtered.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((current) => current + PAGE_SIZE)}
          className="self-center h-[36px] px-[16px] rounded-[8px] text-[14px] font-[500] text-textItemBlur hover:text-newTextColor hover:bg-boxHover transition-colors"
        >
          {t('show_more', '+ Show more')}
        </button>
      )}
    </div>
  );
};
