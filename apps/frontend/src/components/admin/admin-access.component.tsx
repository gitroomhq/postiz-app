'use client';

import React, { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  useDecisionModal,
  useModals,
} from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// postmonster: admin console for the closed access flow (PRD 6)
type Tab = 'access-requests' | 'invites' | 'users';

interface InviteSummary {
  id: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface AccessRequestRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  networks: string[];
  teamSize: string | null;
  useCase: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt: string | null;
  invites: InviteSummary[];
}

interface AccessInviteRow extends InviteSummary {
  accessRequestId: string | null;
  accessRequest?: {
    id: string;
    name: string;
    role: string | null;
    status: string;
  } | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
}

interface UserRow {
  id: string;
  email: string;
  createdAt: string;
  lastOnline: string;
  isSuperAdmin: boolean;
  activated: boolean;
  organizations: {
    role: string;
    channels: number;
    organization: { id: string; name: string; createdAt: string };
  }[];
}

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    APPROVED: 'bg-green-500/15 text-green-400 border-green-500/30',
    REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
    active: 'bg-green-500/15 text-green-400 border-green-500/30',
    used: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    expired: 'bg-red-500/15 text-red-400 border-red-500/30',
    revoked: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <span
      className={`inline-flex px-[8px] py-[2px] rounded-[4px] border text-[12px] ${
        colors[status] || 'bg-sixth border-newTableBorder'
      }`}
    >
      {status}
    </span>
  );
};

const Pagination: FC<{
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}> = ({ page, limit, total, onPage }) => {
  const t = useT();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between text-[13px] opacity-80">
      <div>
        {t('admin_total_rows', '{total} total').replace(
          '{total}',
          String(total)
        )}
      </div>
      <div className="flex gap-[8px] items-center">
        <Button secondary disabled={page === 0} onClick={() => onPage(page - 1)}>
          {t('admin_prev', 'Previous')}
        </Button>
        <span>
          {page + 1} / {totalPages}
        </span>
        <Button
          secondary
          disabled={page + 1 >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {t('admin_next', 'Next')}
        </Button>
      </div>
    </div>
  );
};

const RejectModal: FC<{
  email: string;
  onConfirm: (sendEmail: boolean) => Promise<void>;
}> = ({ email, onConfirm }) => {
  const t = useT();
  const modals = useModals();
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-[4px] border border-newTableBorder bg-newBgColorInner p-[16px] flex flex-col gap-[12px] min-w-[380px]">
      <div className="text-[16px] font-[600]">
        {t('admin_reject_title', 'Reject this request?')}
      </div>
      <div className="text-[13px] opacity-80">
        {t('admin_reject_body', 'The applicant is {email}.').replace(
          '{email}',
          email
        )}
      </div>
      <label className="flex items-center gap-[8px] text-[13px] cursor-pointer">
        <input
          type="checkbox"
          checked={sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
        />
        {t('admin_reject_send_email', 'Send a polite rejection email')}
      </label>
      <div className="flex gap-[8px] justify-end">
        <Button secondary onClick={() => modals.closeCurrent()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          loading={saving}
          onClick={async () => {
            setSaving(true);
            await onConfirm(sendEmail);
            setSaving(false);
            modals.closeCurrent();
          }}
        >
          {t('admin_reject', 'Reject')}
        </Button>
      </div>
    </div>
  );
};

const CreateInviteModal: FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const t = useT();
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-[4px] border border-newTableBorder bg-newBgColorInner p-[16px] flex flex-col gap-[12px] min-w-[380px]">
      <div className="text-[16px] font-[600]">
        {t('admin_create_invite', 'Create invite')}
      </div>
      <Input
        label="Email"
        translationKey="label_email"
        name="invite-email"
        value={email}
        disableForm
        onChange={(e: any) => setEmail(e.target.value)}
        placeholder={t('email_address', 'Email Address')}
      />
      <div className="flex gap-[8px] justify-end">
        <Button secondary onClick={() => modals.closeCurrent()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          loading={saving}
          onClick={async () => {
            setSaving(true);
            const response = await fetch('/admin/access-invites', {
              method: 'POST',
              body: JSON.stringify({ email }),
            });
            setSaving(false);
            if (!response.ok) {
              toaster.show(await response.text(), 'warning');
              return;
            }
            toaster.show(
              t('admin_invite_sent', 'Invite sent to {email}').replace(
                '{email}',
                email
              ),
              'success'
            );
            onCreated();
            modals.closeCurrent();
          }}
        >
          {t('admin_send_invite', 'Send invite')}
        </Button>
      </div>
    </div>
  );
};

const AccessRequestsTab: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const decision = useDecisionModal();
  const modals = useModals();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const limit = 20;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
  });
  const { data, isLoading, mutate } = useSWR<Paged<AccessRequestRow>>(
    `/admin/access-requests?${query.toString()}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load access requests');
      return res.json();
    }
  );

  const approve = useCallback(
    async (row: AccessRequestRow) => {
      const yes = await decision.open({
        title: t('admin_approve_title', 'Approve this request?'),
        description: t(
          'admin_approve_body',
          'An invite email with a one-time link (valid 7 days) will be sent to {email}.'
        ).replace('{email}', row.email),
        approveLabel: t('admin_approve', 'Approve'),
        cancelLabel: t('cancel', 'Cancel'),
      });
      if (!yes) return;
      const response = await fetch(
        `/admin/access-requests/${row.id}/approve`,
        { method: 'POST' }
      );
      if (!response.ok) {
        toaster.show(await response.text(), 'warning');
        return;
      }
      toaster.show(
        t('admin_invite_sent', 'Invite sent to {email}').replace(
          '{email}',
          row.email
        ),
        'success'
      );
      mutate();
    },
    [decision, fetch, mutate, t, toaster]
  );

  const reject = useCallback(
    (row: AccessRequestRow) => {
      modals.openModal({
        title: t('admin_reject_title', 'Reject this request?'),
        children: (
          <RejectModal
            email={row.email}
            onConfirm={async (sendEmail) => {
              const response = await fetch(
                `/admin/access-requests/${row.id}/reject`,
                {
                  method: 'POST',
                  body: JSON.stringify({ sendEmail }),
                }
              );
              if (!response.ok) {
                toaster.show(await response.text(), 'warning');
                return;
              }
              toaster.show(t('admin_rejected', 'Request rejected'), 'success');
              mutate();
            }}
          />
        ),
      });
    },
    [modals, fetch, mutate, t, toaster]
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex flex-wrap gap-[12px] items-end">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] opacity-70">
            {t('admin_filter_status', 'Status')}
          </div>
          <select
            value={status}
            onChange={(e) => {
              setPage(0);
              setStatus(e.target.value);
            }}
            className="bg-newBgColorInner h-[38px] border border-newTableBorder rounded-[8px] px-[10px] text-[14px] text-textColor min-w-[180px]"
          >
            <option value="">{t('admin_all_statuses', 'All statuses')}</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : !data || data.items.length === 0 ? (
        <div className="opacity-70">
          {t('admin_no_requests', 'No access requests yet.')}
        </div>
      ) : (
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[160px_1fr_200px_1.5fr_110px_180px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
            <div>{t('admin_created', 'Created')}</div>
            <div>{t('admin_who', 'Name / Email')}</div>
            <div>{t('admin_role_networks', 'Role / Networks')}</div>
            <div>{t('admin_use_case', 'Use case')}</div>
            <div>{t('admin_status', 'Status')}</div>
            <div className="text-right">{t('admin_actions', 'Actions')}</div>
          </div>
          {data.items.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[160px_1fr_200px_1.5fr_110px_180px] gap-[12px] px-[12px] py-[10px] border-b border-newTableBorder text-[13px] items-center"
            >
              <div className="opacity-70">
                {new Date(row.createdAt).toLocaleDateString()}
              </div>
              <div>
                <div>{row.name}</div>
                <div className="opacity-70">{row.email}</div>
              </div>
              <div>
                <div>{row.role || '—'}</div>
                <div className="opacity-70">{(row.networks || []).join(', ')}</div>
              </div>
              <div className="opacity-80 line-clamp-3">
                {row.useCase || '—'}
              </div>
              <div>
                <StatusBadge status={row.status} />
              </div>
              <div className="flex gap-[8px] justify-end">
                {row.status === 'PENDING' && (
                  <>
                    <Button
                      className="!h-[32px] !px-[12px] rounded-[6px]"
                      onClick={() => approve(row)}
                    >
                      {t('admin_approve', 'Approve')}
                    </Button>
                    <Button
                      secondary
                      className="!h-[32px] !px-[12px] rounded-[6px]"
                      onClick={() => reject(row)}
                    >
                      {t('admin_reject', 'Reject')}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPage={setPage}
        />
      )}
    </div>
  );
};

const InvitesTab: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();
  const decision = useDecisionModal();
  const modals = useModals();

  const { data, isLoading, mutate } = useSWR<AccessInviteRow[]>(
    '/admin/access-invites',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load invites');
      return res.json();
    }
  );

  const resend = useCallback(
    async (row: AccessInviteRow) => {
      const yes = await decision.open({
        title: t('admin_resend_title', 'Resend this invite?'),
        description: t(
          'admin_resend_body',
          'A new one-time link is emailed to {email} and the previous link stops working.'
        ).replace('{email}', row.email),
        approveLabel: t('admin_resend', 'Resend'),
        cancelLabel: t('cancel', 'Cancel'),
      });
      if (!yes) return;
      const response = await fetch(`/admin/access-invites/${row.id}/resend`, {
        method: 'POST',
      });
      if (!response.ok) {
        toaster.show(await response.text(), 'warning');
        return;
      }
      toaster.show(
        t('admin_invite_sent', 'Invite sent to {email}').replace(
          '{email}',
          row.email
        ),
        'success'
      );
      mutate();
    },
    [decision, fetch, mutate, t, toaster]
  );

  const revoke = useCallback(
    async (row: AccessInviteRow) => {
      const yes = await decision.open({
        title: t('admin_revoke_title', 'Revoke this invite?'),
        description: t(
          'admin_revoke_body',
          'The link emailed to {email} stops working immediately.'
        ).replace('{email}', row.email),
        approveLabel: t('admin_revoke', 'Revoke'),
        cancelLabel: t('cancel', 'Cancel'),
      });
      if (!yes) return;
      const response = await fetch(`/admin/access-invites/${row.id}/revoke`, {
        method: 'POST',
      });
      if (!response.ok) {
        toaster.show(await response.text(), 'warning');
        return;
      }
      toaster.show(t('admin_revoked', 'Invite revoked'), 'success');
      mutate();
    },
    [decision, fetch, mutate, t, toaster]
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex justify-end">
        <Button
          onClick={() =>
            modals.openModal({
              title: t('admin_create_invite', 'Create invite'),
              children: <CreateInviteModal onCreated={() => mutate()} />,
            })
          }
        >
          {t('admin_create_invite', 'Create invite')}
        </Button>
      </div>

      {isLoading ? (
        <LoadingComponent />
      ) : !data || data.length === 0 ? (
        <div className="opacity-70">
          {t('admin_no_invites', 'No invites yet.')}
        </div>
      ) : (
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[1.2fr_150px_150px_120px_1fr_180px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
            <div>{t('admin_email', 'Email')}</div>
            <div>{t('admin_created', 'Created')}</div>
            <div>{t('admin_expires', 'Expires')}</div>
            <div>{t('admin_status', 'Status')}</div>
            <div>{t('admin_request', 'Request')}</div>
            <div className="text-right">{t('admin_actions', 'Actions')}</div>
          </div>
          {data.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1.2fr_150px_150px_120px_1fr_180px] gap-[12px] px-[12px] py-[10px] border-b border-newTableBorder text-[13px] items-center"
            >
              <div>{row.email}</div>
              <div className="opacity-70">
                {new Date(row.createdAt).toLocaleDateString()}
              </div>
              <div className="opacity-70">
                {new Date(row.expiresAt).toLocaleDateString()}
              </div>
              <div>
                <StatusBadge status={row.status} />
              </div>
              <div className="opacity-70">
                {row.accessRequest
                  ? `${row.accessRequest.name} (${row.accessRequest.status})`
                  : '—'}
              </div>
              <div className="flex gap-[8px] justify-end">
                {row.status === 'active' && (
                  <>
                    <Button
                      secondary
                      className="!h-[32px] !px-[12px] rounded-[6px]"
                      onClick={() => resend(row)}
                    >
                      {t('admin_resend', 'Resend')}
                    </Button>
                    <Button
                      secondary
                      className="!h-[32px] !px-[12px] rounded-[6px]"
                      onClick={() => revoke(row)}
                    >
                      {t('admin_revoke', 'Revoke')}
                    </Button>
                  </>
                )}
                {row.status === 'revoked' && (
                  <Button
                    secondary
                    className="!h-[32px] !px-[12px] rounded-[6px]"
                    onClick={() => resend(row)}
                  >
                    {t('admin_resend', 'Resend')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UsersTab: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const [page, setPage] = useState(0);
  const limit = 20;

  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  const { data, isLoading } = useSWR<Paged<UserRow>>(
    `/admin/users?${query.toString()}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load users');
      return res.json();
    }
  );

  return (
    <div className="flex flex-col gap-[12px]">
      {isLoading ? (
        <LoadingComponent />
      ) : !data || data.items.length === 0 ? (
        <div className="opacity-70">{t('admin_no_users', 'No users yet.')}</div>
      ) : (
        <div className="border border-newTableBorder rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[1.2fr_150px_1.5fr_120px_170px] gap-[12px] px-[12px] py-[10px] bg-newBgColorInner text-[12px] uppercase opacity-70 border-b border-newTableBorder">
            <div>{t('admin_email', 'Email')}</div>
            <div>{t('admin_created', 'Created')}</div>
            <div>{t('admin_workspaces', 'Workspaces')}</div>
            <div>{t('admin_channels', 'Channels')}</div>
            <div>{t('admin_last_active', 'Last active')}</div>
          </div>
          {data.items.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1.2fr_150px_1.5fr_120px_170px] gap-[12px] px-[12px] py-[10px] border-b border-newTableBorder text-[13px] items-center"
            >
              <div>
                {row.email}
                {row.isSuperAdmin && (
                  <span className="ms-[6px] text-[11px] opacity-70">
                    (super admin)
                  </span>
                )}
              </div>
              <div className="opacity-70">
                {new Date(row.createdAt).toLocaleDateString()}
              </div>
              <div className="opacity-80">
                {row.organizations
                  .map((o) => o.organization.name)
                  .join(', ') || '—'}
              </div>
              <div className="opacity-80">
                {row.organizations.reduce((sum, o) => sum + o.channels, 0)}
              </div>
              <div className="opacity-70">
                {new Date(row.lastOnline).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPage={setPage}
        />
      )}
    </div>
  );
};

export const AdminAccessComponent: FC<{ initialTab?: string }> = ({
  initialTab,
}) => {
  const t = useT();
  const user = useUser();
  const [tab, setTab] = useState<Tab>(
    initialTab === 'invites' || initialTab === 'users'
      ? (initialTab as Tab)
      : 'access-requests'
  );

  if (!user?.isSuperAdmin) {
    return (
      <div className="text-textColor p-[20px]">
        {t('admin_no_access', 'You do not have access to this page.')}
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    {
      id: 'access-requests',
      label: t('admin_tab_requests', 'Access requests'),
    },
    { id: 'invites', label: t('admin_tab_invites', 'Invites') },
    { id: 'users', label: t('admin_tab_users', 'Users') },
  ];

  return (
    <div className="flex flex-col gap-[16px] text-textColor">
      <div className="flex items-center justify-between">
        <div className="text-[20px] font-[600]">
          {t('admin_title', 'Admin')}
        </div>
      </div>
      <div className="flex gap-[8px] border-b border-newTableBorder">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-[14px] py-[8px] text-[14px] cursor-pointer border-b-[2px] -mb-[1px] ${
              tab === item.id
                ? 'border-newTextColor font-[600]'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'access-requests' && <AccessRequestsTab />}
      {tab === 'invites' && <InvitesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  );
};
