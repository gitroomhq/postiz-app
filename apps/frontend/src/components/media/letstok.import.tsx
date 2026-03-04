'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import clsx from 'clsx';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';

const MediaCard: FC<{
  item: {
    id: string;
    fileUrl: string;
    posterUrl?: string;
    type: string;
    createdAt: string;
  };
  isSelected: boolean;
  onClick: () => void;
}> = ({ item, isSelected, onClick }) => {
  const url = item.fileUrl?.split('?')[0] || '';
  const isVideo =
    item.type === 'Video' || url.endsWith('.mp4') || url.endsWith('.mov');

  return (
    <div
      onClick={onClick}
      className={clsx(
        'w-full cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:opacity-80',
        isSelected ? 'border-[#612BD3] shadow-lg' : 'border-transparent'
      )}
    >
      <div className="relative aspect-video bg-black/10">
        {isVideo ? (
          item.posterUrl ? (
            <img
              src={item.posterUrl}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <video
              src={item.fileUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          )
        ) : (
          <img
            src={item.fileUrl}
            className="w-full h-full object-cover"
            alt=""
          />
        )}
        {isVideo && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-[6px] py-[2px] rounded">
            VIDEO
          </div>
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-[#612BD3]/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#612BD3]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-2 text-xs text-textColor/70">
        <span className="capitalize">{item.type}</span>
        {' \u00b7 '}
        {new Date(item.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

type TabKey = 'gallery' | 'ai-agent';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'gallery', label: 'Gallery' },
  { key: 'ai-agent', label: 'AI Generated' },
];

const MediaGrid: FC<{
  integrationId: string;
  source: TabKey;
  selectedItems: any[];
  toggleItem: (item: any) => void;
}> = ({ integrationId, source, selectedItems, toggleItem }) => {
  const fetch = useFetch();
  const [page, setPage] = useState(1);

  const loadMedia = useCallback(async () => {
    return (
      await fetch(`/third-party/function/${integrationId}/listMedia`, {
        method: 'POST',
        body: JSON.stringify({ source, page }),
      })
    ).json();
  }, [integrationId, source, page]);

  const { data, isLoading } = useSWR(
    `letstok-gallery-${integrationId}-${source}-p${page}`,
    loadMedia,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingComponent width={100} height={100} />
      </div>
    );
  }

  const items = data?.data || [];
  const total = data?.total ?? items.length;
  const pageSize = data?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!items.length && page === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-textColor/70">
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-center">
          {source === 'gallery'
            ? 'No media in your gallery yet.'
            : 'No AI-generated media found.'}
          <br />
          Create content in Letstok AI first to import it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
        {items.map((item: any) => (
          <MediaCard
            key={item.id}
            item={item}
            isSelected={!!selectedItems.find((v) => v.id === item.id)}
            onClick={() => toggleItem(item)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={clsx(
              'cursor-pointer px-3 py-1.5 rounded text-sm border border-newTextColor/10',
              page <= 1
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-newTextColor/5'
            )}
          >
            Previous
          </button>
          <span className="text-sm text-textColor/70">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={clsx(
              'cursor-pointer px-3 py-1.5 rounded text-sm border border-newTextColor/10',
              page >= totalPages
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-newTextColor/5'
            )}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const LetstokGalleryModal: FC<{
  integrationId: string;
  onImported: () => void;
  closeModal: () => void;
}> = ({ integrationId, onImported, closeModal }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('gallery');

  const toggleItem = useCallback((item: any) => {
    setSelectedItems((prev) => {
      const exists = prev.find((v) => v.id === item.id);
      if (exists) {
        return prev.filter((v) => v.id !== item.id);
      }
      return [...prev, item];
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedItems.length) return;

    setIsImporting(true);
    try {
      let imported = 0;
      for (const item of selectedItems) {
        const ext = item.fileUrl.split('?')[0].split('.').pop() || 'png';
        const name = `letstok-${item.id}.${ext}`;

        const response = await fetch('/media/import-from-url', {
          method: 'POST',
          body: JSON.stringify({
            url: item.fileUrl,
            originalName: name,
          }),
        });

        if (response.ok) {
          imported++;
        }
      }

      if (imported > 0) {
        toaster.show(
          `Successfully imported ${imported} item${imported > 1 ? 's' : ''} from Letstok AI`,
          'success'
        );
        onImported();
        closeModal();
      } else {
        toaster.show('Failed to import media', 'warning');
      }
    } catch {
      toaster.show('Error importing from Letstok AI', 'warning');
    } finally {
      setIsImporting(false);
    }
  }, [selectedItems, fetch, toaster, onImported, closeModal]);

  return (
    <div className="flex flex-col gap-4">
      {isImporting && (
        <div className="fixed left-0 top-0 w-full h-screen bg-black/90 z-50 flex flex-col justify-center items-center text-center text-xl text-white">
          Importing from Letstok AI...
          <br />
          <LoadingComponent width={200} height={200} />
        </div>
      )}

      <div className="flex gap-[2px] border-b border-newTextColor/10">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'cursor-pointer px-[16px] py-[10px] text-[14px] font-[500] transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-[#612BD3] text-[#612BD3]'
                : 'border-transparent text-textColor/60 hover:text-textColor'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MediaGrid
        integrationId={integrationId}
        source={activeTab}
        selectedItems={selectedItems}
        toggleItem={toggleItem}
      />

      <div className="flex justify-end gap-[8px]">
        <button
          onClick={closeModal}
          className="cursor-pointer h-[44px] px-[18px] items-center justify-center border border-newTextColor/10 flex rounded-[8px] text-textColor"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={!selectedItems.length || isImporting}
          className={clsx(
            'cursor-pointer h-[44px] px-[18px] items-center justify-center bg-[#612BD3] text-white flex rounded-[8px]',
            (!selectedItems.length || isImporting) &&
              'opacity-50 cursor-not-allowed'
          )}
        >
          Import {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
        </button>
      </div>
    </div>
  );
};

export const LetstokImportButton: FC<{
  onImported: () => void;
}> = ({ onImported }) => {
  const fetch = useFetch();
  const modals = useModals();
  const toaster = useToaster();
  const [isConnecting, setIsConnecting] = useState(false);

  const loadLetstokIntegration = useCallback(async () => {
    const thirdParties = await (await fetch('/third-party')).json();
    return thirdParties.find((tp: any) => tp.identifier === 'letstok') || null;
  }, []);

  const { data: letstokIntegration, isLoading, mutate } = useSWR(
    'letstok-integration-check',
    loadLetstokIntegration,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  const openGalleryWithIntegration = useCallback(
    (integration: any) => {
      modals.openModal({
        title: 'Import from Letstok AI',
        size: '80%',
        children: (close) => (
          <LetstokGalleryModal
            integrationId={integration.id}
            onImported={onImported}
            closeModal={close}
          />
        ),
      });
    },
    [modals, onImported]
  );

  const openGallery = useCallback(async () => {
    if (letstokIntegration) {
      openGalleryWithIntegration(letstokIntegration);
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch('/third-party/auto-connect', { method: 'POST' });
      const result = await res.json();

      if (result.connected && result.integration) {
        await mutate();
        openGalleryWithIntegration(result.integration);
      } else {
        toaster.show(
          'Could not connect your Letstok AI account automatically. Try adding it manually in Settings > Integrations.',
          'warning'
        );
      }
    } catch {
      toaster.show(
        'Could not connect to Letstok AI. Please try again.',
        'warning'
      );
    } finally {
      setIsConnecting(false);
    }
  }, [letstokIntegration, fetch, modals, onImported, toaster, mutate, openGalleryWithIntegration]);

  if (isLoading) {
    return null;
  }

  return (
    <button
      onClick={openGallery}
      disabled={isConnecting}
      className={clsx(
        'cursor-pointer bg-btnSimple changeColor flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px]',
        isConnecting && 'opacity-60 cursor-not-allowed'
      )}
    >
      <img
        src="/icons/third-party/letstok.svg"
        className="w-[18px] h-[18px]"
        alt=""
      />
      <div>{isConnecting ? 'Connecting...' : 'Import from Letstok AI'}</div>
    </button>
  );
};
