import { thirdPartyWrapper } from '@gitroom/frontend/components/third-parties/third-party.wrapper';
import {
  useThirdPartyFunctionSWR,
  useThirdPartySubmit,
} from '@gitroom/frontend/components/third-parties/third-party.function';
import { useThirdParty } from '@gitroom/frontend/components/third-parties/third-party.media';
import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const MediaCard: FC<{
  item: { id: string; fileUrl: string; type: string; createdAt: string };
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
        isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent'
      )}
    >
      <div className="relative aspect-video bg-black/10">
        {isVideo ? (
          <video
            src={item.fileUrl}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <img
            src={item.fileUrl}
            className="w-full h-full object-cover"
            alt=""
          />
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-500"
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

const LetstokProviderComponent = () => {
  const thirdParty = useThirdParty();
  const { data, isLoading } = useThirdPartyFunctionSWR(
    'LOAD_ONCE',
    'listMedia'
  );
  const send = useThirdPartySubmit();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!selectedVideo) return;

    setIsSubmitting(true);
    try {
      const result = await send({ videoUrl: selectedVideo.fileUrl });
      thirdParty.onChange(result);
      thirdParty.close();
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedVideo, send, thirdParty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <LoadingComponent width={100} height={100} />
      </div>
    );
  }

  const items = data?.data || [];

  if (!items.length) {
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
          No media found in your Letstok AI gallery.
          <br />
          Create content in Letstok AI first to import it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isSubmitting && (
        <div className="fixed left-0 top-0 w-full h-screen bg-black/90 z-50 flex flex-col justify-center items-center text-center text-xl text-white">
          Importing from Letstok AI...
          <br />
          <LoadingComponent width={200} height={200} />
        </div>
      )}

      <div className="text-lg font-medium text-textColor">
        Select media to import
      </div>

      <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {items.map((item: any) => (
          <MediaCard
            key={item.id}
            item={item}
            isSelected={selectedVideo?.id === item.id}
            onClick={() =>
              setSelectedVideo(
                selectedVideo?.id === item.id ? null : item
              )
            }
          />
        ))}
      </div>

      <Button
        type="button"
        onClick={handleImport}
        disabled={!selectedVideo}
        className={clsx(!selectedVideo && 'opacity-50 cursor-not-allowed')}
      >
        Import Selected
      </Button>
    </div>
  );
};

export default thirdPartyWrapper('letstok', LetstokProviderComponent);
