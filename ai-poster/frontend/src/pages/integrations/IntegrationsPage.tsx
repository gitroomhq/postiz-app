import React, { useState } from 'react';
import {
  Plus,
  Plug2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useIntegrations, type IntegrationDto } from '@/hooks/useIntegrations';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_ICON_COLORS } from '@/lib/constants';
import { formatDate, cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { Platform } from '@ai-poster/shared';
import toast from 'react-hot-toast';

const availablePlatforms = Object.values(Platform).map((p) => ({
  platform: p,
  displayName: PLATFORM_DISPLAY_NAMES[p],
  color: PLATFORM_ICON_COLORS[p],
}));

export function IntegrationsPage() {
  const { integrations, isLoading, mutate } = useIntegrations();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (platform: Platform) => {
    setConnecting(platform);
    try {
      const result = await fetchApi<{ authUrl: string }>('/integrations/connect', {
        method: 'POST',
        body: JSON.stringify({ platform }),
      });
      window.location.href = result.authUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start connection');
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Are you sure you want to disconnect this channel?')) return;
    try {
      await fetchApi(`/integrations/${id}`, { method: 'DELETE' });
      toast.success('Channel disconnected');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const handleToggleActive = async (integration: IntegrationDto) => {
    try {
      await fetchApi(`/integrations/${integration.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !integration.isActive }),
      });
      toast.success(
        integration.isActive ? 'Channel disabled' : 'Channel enabled'
      );
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">Integrations</h2>
          <p className="subtle-text mt-1">
            Connect and manage your social media channels.
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setConnectModalOpen(true)}
        >
          Connect Channel
        </Button>
      </div>

      {integrations.length === 0 ? (
        <EmptyState
          icon={<Plug2 className="h-7 w-7" />}
          title="No channels connected"
          description="Connect your social media accounts to start publishing posts."
          actionLabel="Connect Channel"
          onAction={() => setConnectModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={integration.avatar}
                      name={integration.displayName || integration.accountName}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-text-primary">
                        {integration.displayName || integration.accountName}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              PLATFORM_ICON_COLORS[integration.platform] || '#6b7280',
                          }}
                        />
                        <span className="text-xs text-text-muted">
                          {PLATFORM_DISPLAY_NAMES[integration.platform]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu
                    trigger={
                      <button className="rounded-lg p-1 text-text-muted hover:bg-surface-tertiary hover:text-text-primary">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                    items={[
                      {
                        id: 'toggle',
                        label: integration.isActive ? 'Disable' : 'Enable',
                        icon: integration.isActive ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        ),
                        onClick: () => handleToggleActive(integration),
                      },
                      {
                        id: 'disconnect',
                        label: 'Disconnect',
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onClick: () => handleDisconnect(integration.id),
                      },
                    ]}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    Connected {formatDate(integration.createdAt)}
                  </span>
                  <Badge
                    variant={integration.isActive ? 'approved' : 'draft'}
                    dot
                  >
                    {integration.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      <Modal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title="Connect a Channel"
        size="lg"
      >
        <p className="mb-5 text-sm text-text-muted">
          Choose a platform to connect. You'll be redirected to authorize access.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {availablePlatforms.map(({ platform, displayName, color }) => {
            const isConnected = integrations.some(
              (i) => i.platform === platform
            );
            return (
              <button
                key={platform}
                onClick={() => handleConnect(platform)}
                disabled={!!connecting}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                  isConnected
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                )}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {platform.slice(0, 2)}
                </div>
                <span className="text-xs font-medium text-text-primary">
                  {displayName}
                </span>
                {isConnected && (
                  <span className="text-xs text-status-approved">Connected</span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
