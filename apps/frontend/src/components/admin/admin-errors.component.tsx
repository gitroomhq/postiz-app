'use client';

import React, { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import copy from 'copy-to-clipboard';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

interface ErrorRow {
  id: string;
  message: string;
  body: string;
  platform: string;
  postId: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    users: { user: { id: string; email: string; name: string | null } }[];
  };
  post: { id: string; content: string | null };
}

interface ErrorsResponse {
  items: ErrorRow[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const safeParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const ErrorDetailsModal: FC<{ row: ErrorRow }> = ({ row }) => {
  const modal = useModals();
  const toaster = useToaster();
  const parsedMessage = useMemo(() => safeParse(row.message), [row.message]);
  const parsedBody = useMemo(() => safeParse(row.body), [row.body]);

  const copyAll = useCallback(() => {
    copy(
      JSON.stringify(
        { message: parsedMessage, body: parsedBody, meta: row },
        null,
        2
      )
    );
    toaster.show('Debug code copied to clipboard', 'success');
  }, [parsedMessage, parsedBody, row, toaster]);

  return (
    <div className="rounded-[4px] border border-newTableBorder bg-newBgColorInner px-[16px] pb-[16px] relative w-full max-h-[80vh] overflow-auto">
      <div className="sticky top-0 bg-newBgColorInner py-[16px] flex items-center justify-between gap-[12px] z-10 border-b border-newTableBorder mb-[12px]">
        <div className="text-[16px] font-[600]">Error Details</div>
        <div className="flex gap-[8px] items-center">
          <Button onClick={copyAll}>Copy Debug Code</Button>
          <button
            className="outline-none w-[28px] h-[28px] flex items-center justify-center hover:bg-tableBorder cursor-pointer rounded"
            type="button"
            onClick={() => modal.closeAll()}
          >
            <svg
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px] text-[13px] mb-[12px]">
        <div>
          <div className="opacity-60">Platform</div>
          <div>{row.platform}</div>
        </div>
        <div>
          <div className="opacity-60">Created</div>
          <div>{new Date(row.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-60">Organization</div>
          <div>
            {row.organization?.name}{' '}
            <span className="opacity-60">({row.organization?.id})</span>
          </div>
        </div>
        <div>
          <div className="opacity-60">Users</div>
          <div className="break-all">
            {row.organization?.users
              ?.map((u) => u.user?.email)
              .filter(Boolean)
              .join(', ') || '—'}
          </div>
        </div>
        <div className="col-span-2">
          <div className="opacity-60">Post ID</div>
          <div>{row.postId}</div>
        </div>
      </div>

      <div className="text-[13px] font-[600] mb-[6px]">message</div>
      <pre className="text-[12px] bg-sixth p-[12px] rounded overflow-auto max-h-[40vh] whitespace-pre-wrap break-all">
        {typeof parsedMessage === 'string'
          ? parsedMessage
          : JSON.stringify(parsedMessage, null, 2)}
      </pre>

      <div className="text-[13px] font-[600] mb-[6px] mt-[12px]">body</div>
      <pre className="text-[12px] bg-sixth p-[12px] rounded overflow-auto max-h-[40vh] whitespace-pre-wrap break-all">
        {typeof parsedBody === 'string'
          ? parsedBody
          : JSON.stringify(parsedBody, null, 2)}
      </pre>
    </div>
  );
};

const usePlatformsList = () => {
  const fetch = useFetch();
  return useSWR<string[]>('/admin/errors/platforms', async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  });
};

const useErrorsList = (params: {
  page: number;
  limit: number;
  platform: string;
  email: string;
  unknownFirst: boolean;
}) => {
  const fetch = useFetch();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.platform ? { platform: params.platform } : {}),
    ...(params.email ? { email: params.email } : {}),
    unknownFirst: params.unknownFirst ? 'true' : 'false',
  });
  const key = `/admin/errors?${query.toString()}`;
  return useSWR<ErrorsResponse>(key, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to load errors');
    }
    return res.json();
  });
};

export const AdminErrorsComponent: FC = () => {
  const user = useUser();
  const modal = useModals();
  const toaster = useToaster();

  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [platform, setPlatform] = useState('');
  const [email, setEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [unknownFirst, setUnknownFirst] = useState(true);

  const { data: platforms } = usePlatformsList();
  const { data, isLoading, error } = useErrorsList({
    page,
    limit,
    platform,
    email,
    unknownFirst,
  });

  const onApplyEmail = useCallback(() => {
    setPage(0);
    setEmail(emailInput.trim());
  }, [emailInput]);

  const onClear = useCallback(() => {
    setPage(0);
    setEmail('');
    setEmailInput('');
    setPlatform('');
  }, []);

  const openDetails = useCallback(
    (row: ErrorRow) => {
      modal.openModal({
        closeOnClickOutside: true,
        withCloseButton: false,
        classNames: {
          modal: 'w-[100%] max-w-[1100px] text-textColor',
        },
        children: <ErrorDetailsModal row={row} />,
      });
    },
    [modal]
  );

  const copyRow = useCallback(
    (row: ErrorRow) => {
      copy(
        JSON.stringify(
          { message: safeParse(row.message), body: safeParse(row.body), meta: row },
          null,
          2
        )
      );
      toaster.show('Debug code copied to clipboard', 'success');
    },
    [toaster]
  );

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-textColor p-[20px]">
        You do not have access to this page.
      </div>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="flex flex-col gap-[16px] text-textColor">
      <div className="flex items-center justify-between">
        <div className="text-[20px] font-[600]">Errors</div>
        <div className="text-[13px] opacity-70">
          {data ? `${data.total} total` : ''}
        </div>
      </div>

      <div className="flex flex-wrap gap-[12px] items-end bg-newBgColorInner border border-newTableBorder rounded-[8px] p-[12px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">Platform</div>
          <select
            value={platform}
            onChange={(e) => {
              setPage(0);
              setPlatform(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor min-w-[180px]"
          >
            <option value="">All platforms</option>
            {(platforms || []).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">Email contains</div>
          <div className="flex gap-[8px]">
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApplyEmail();
              }}
              placeholder="user@example.com"
              className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor min-w-[240px]"
            />
            <Button onClick={onApplyEmail}>Apply</Button>
          </div>
        </div>

        <label className="flex items-center gap-[6px] text-[13px] cursor-pointer h-[38px]">
          <input
            type="checkbox"
            checked={unknownFirst}
            onChange={(e) => {
              setPage(0);
              setUnknownFirst(e.target.checked);
            }}
          />
          Unknown Error first
        </label>

        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">Per page</div>
          <select
            value={limit}
            onChange={(e) => {
              setPage(0);
              setLimit(parseInt(e.target.value, 10));
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <Button secondary onClick={onClear}>
          Clear filters
        </Button>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : error ? (
        <div className="text-red-400">Failed to load errors.</div>
      ) : !data || data.items.length === 0 ? (
        <div className="opacity-70">No errors found.</div>
      ) : (
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[170px_120px_220px_1fr_220px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
            <div>Created</div>
            <div>Platform</div>
            <div>User / Org</div>
            <div>Message</div>
            <div className="text-right">Actions</div>
          </div>
          {data.items.map((row) => {
            const isUnknown = (row.message || '').includes('Unknown Error');
            const emails =
              row.organization?.users
                ?.map((u) => u.user?.email)
                .filter(Boolean)
                .join(', ') || '—';
            const preview =
              (row.message || '').length > 280
                ? row.message.slice(0, 280) + '…'
                : row.message;
            return (
              <div
                key={row.id}
                className="grid grid-cols-[170px_120px_220px_1fr_220px] gap-[12px] px-[12px] py-[10px] text-[13px] border-b border-newTableBorder last:border-b-0 items-start"
              >
                <div className="opacity-90">
                  {new Date(row.createdAt).toLocaleString()}
                </div>
                <div>
                  <span
                    className={
                      isUnknown
                        ? 'text-red-400 font-[600]'
                        : 'opacity-90'
                    }
                  >
                    {row.platform}
                  </span>
                </div>
                <div className="break-all">
                  <div>{emails}</div>
                  <div className="opacity-60 text-[12px]">
                    {row.organization?.name}
                  </div>
                </div>
                <div className="break-all whitespace-pre-wrap font-mono text-[12px] opacity-90">
                  {preview}
                </div>
                <div className="flex gap-[8px] justify-end">
                  <Button secondary onClick={() => openDetails(row)}>
                    View
                  </Button>
                  <Button onClick={() => copyRow(row)}>Copy</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[13px] opacity-70">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex gap-[8px]">
          <Button
            secondary
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            disabled={!data?.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
