'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

interface MusicResult {
  id: string;
  title: string;
  artist: string;
  image: string;
  duration: number;
  previewUrl: string;
}

interface SelectedMusic {
  id: string;
  title?: string;
  artist?: string;
  image?: string;
  audio_volume?: number;
  video_volume?: number;
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(
    2,
    '0'
  )}`;
};

export const TikTokMusicSelector: FC<{
  name: string;
  label: string;
  showVolumes: boolean;
  onChange: (event: {
    target: {
      value: SelectedMusic | undefined;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, label, showVolumes } = props;
  const t = useT();
  const { getValues } = useSettings();
  const customFunc = useCustomProviderFunction();
  const [value, setValue] = useState<SelectedMusic | undefined>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string>('');
  const player = useRef<HTMLAudioElement | undefined>(undefined);

  useEffect(() => {
    const settings = getValues()[name];
    if (settings?.id) {
      setValue(settings);
    }
  }, []);

  const stopPreview = useCallback(() => {
    player.current?.pause();
    player.current = undefined;
    setPlayingId('');
  }, []);

  useEffect(() => stopPreview, []);

  const emit = useCallback(
    (newValue: SelectedMusic | undefined) => {
      setValue(newValue);
      onChange({
        target: {
          value: newValue,
          name,
        },
      });
    },
    [onChange, name]
  );

  // The commercial music library trending list has no text search parameter,
  // so the full list is loaded once and the query filters it locally.
  useEffect(() => {
    if (!open || results.length) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    customFunc
      .get('musicSearch')
      .then((list) => {
        if (!cancelled) {
          setResults(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredResults = useMemo(() => {
    if (!query) {
      return results;
    }
    const lowerQuery = query.toLowerCase();
    return results.filter(
      (track) =>
        track.title.toLowerCase().indexOf(lowerQuery) > -1 ||
        track.artist.toLowerCase().indexOf(lowerQuery) > -1
    );
  }, [results, query]);

  const togglePreview = useCallback(
    (track: MusicResult) => {
      if (playingId === track.id) {
        stopPreview();
        return;
      }
      stopPreview();
      if (!track.previewUrl) {
        return;
      }
      const newPlayer = new Audio(track.previewUrl);
      newPlayer.onended = () => setPlayingId('');
      // A failing preview URL rejects the play() promise - reset the playing
      // state so the row doesn't show "Stop" while nothing is playing.
      newPlayer.play().catch(() => {
        if (player.current === newPlayer) {
          player.current = undefined;
          setPlayingId('');
        }
      });
      player.current = newPlayer;
      setPlayingId(track.id);
    },
    [playingId, stopPreview]
  );

  const selectMusic = useCallback(
    (track: MusicResult) => {
      stopPreview();
      setOpen(false);
      emit({
        id: track.id,
        title: track.title,
        artist: track.artist,
        image: track.image,
        audio_volume: 50,
        video_volume: 50,
      });
    },
    [emit, stopPreview]
  );

  const removeMusic = useCallback(() => {
    emit(undefined);
  }, [emit]);

  const changeVolume = useCallback(
    (key: 'audio_volume' | 'video_volume', volume: number) => {
      if (!value) {
        return;
      }
      emit({
        ...value,
        [key]: volume,
      });
    },
    [emit, value]
  );

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="text-[14px]">{label}</div>
      {value?.id ? (
        <div className="flex flex-col gap-[12px] bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px]">
          <div className="flex items-center gap-[12px]">
            {!!value.image && (
              <img
                src={value.image}
                className="w-[42px] h-[42px] rounded-[8px] object-cover"
              />
            )}
            <div className="flex-1 flex flex-col">
              <div className="text-[14px]">{value.title}</div>
              {!!value.artist && (
                <div className="text-[12px] opacity-70">{value.artist}</div>
              )}
            </div>
            <div
              className="cursor-pointer text-[14px] opacity-70 hover:opacity-100"
              onClick={removeMusic}
            >
              X
            </div>
          </div>
          {showVolumes && (
            <div className="flex gap-[18px]">
              <div className="flex-1 flex flex-col gap-[6px]">
                <div className="text-[12px]">
                  {t('tiktok_music_volume', 'Music volume')} (
                  {value.audio_volume ?? 50})
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value.audio_volume ?? 50}
                  onChange={(e) =>
                    changeVolume('audio_volume', +e.target.value)
                  }
                />
              </div>
              <div className="flex-1 flex flex-col gap-[6px]">
                <div className="text-[12px]">
                  {t('tiktok_video_volume', 'Original video volume')} (
                  {value.video_volume ?? 50})
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value.video_volume ?? 50}
                  onChange={(e) =>
                    changeVolume('video_volume', +e.target.value)
                  }
                />
              </div>
            </div>
          )}
        </div>
      ) : !open ? (
        <div>
          <div
            className="h-[42px] px-[16px] inline-flex items-center cursor-pointer bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
            onClick={() => setOpen(true)}
          >
            {t('tiktok_add_music', 'Add music')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[6px]">
          <div className="flex gap-[6px]">
            <div className="flex-1 h-[42px] bg-newBgColorInner border-newTableBorder border rounded-[8px] flex items-center">
              <input
                className="h-full w-full bg-transparent outline-none px-[16px] text-[14px] text-textColor placeholder-textColor"
                placeholder={t(
                  'tiktok_search_music',
                  'Filter trending tracks by name or artist'
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div
              className="h-[42px] px-[16px] flex items-center cursor-pointer bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
              onClick={() => {
                stopPreview();
                setOpen(false);
              }}
            >
              {t('cancel', 'Cancel')}
            </div>
          </div>
          <div className="max-h-[250px] overflow-y-auto flex flex-col bg-newBgColorInner border-newTableBorder border rounded-[8px]">
            {loading ? (
              <div className="p-[12px] text-[14px] opacity-70">
                {t('loading', 'Loading...')}
              </div>
            ) : !filteredResults.length ? (
              <div className="p-[12px] text-[14px] opacity-70">
                {t('tiktok_no_music_found', 'No music found')}
              </div>
            ) : (
              filteredResults.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-[12px] p-[8px] hover:bg-newTableBorder cursor-pointer"
                  onClick={() => selectMusic(track)}
                >
                  {!!track.image && (
                    <img
                      src={track.image}
                      className="w-[36px] h-[36px] rounded-[8px] object-cover"
                    />
                  )}
                  <div className="flex-1 flex flex-col">
                    <div className="text-[14px]">{track.title}</div>
                    <div className="text-[12px] opacity-70">
                      {[track.artist, track.duration ? formatDuration(track.duration) : '']
                        .filter((f) => f)
                        .join(' · ')}
                    </div>
                  </div>
                  {!!track.previewUrl && (
                    <div
                      className={clsx(
                        'px-[12px] text-[12px] opacity-70 hover:opacity-100',
                        playingId === track.id && 'opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreview(track);
                      }}
                    >
                      {playingId === track.id
                        ? t('stop', 'Stop')
                        : t('play', 'Play')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
