'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';

interface AudioResult {
  id: string;
  title: string;
  artist: string;
  image: string;
  duration: number;
  previewUrl: string;
}

interface SelectedAudio {
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

export const InstagramAudioSelector: FC<{
  name: string;
  label: string;
  disabled?: boolean;
  onChange: (event: {
    target: {
      value: SelectedAudio | undefined;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, label, disabled } = props;
  const t = useT();
  const { getValues } = useSettings();
  const customFunc = useCustomProviderFunction();
  const [value, setValue] = useState<SelectedAudio | undefined>();
  const [open, setOpen] = useState(false);
  const [audioType, setAudioType] = useState<'music' | 'original_sound'>(
    'music'
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AudioResult[]>([]);
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
    (newValue: SelectedAudio | undefined) => {
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

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    const search = setTimeout(async () => {
      try {
        const list = await customFunc.get('audioSearch', {
          q: query,
          type: audioType,
        });
        if (!cancelled) {
          setResults(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(search);
    };
  }, [query, audioType, open]);

  const togglePreview = useCallback(
    (audio: AudioResult) => {
      if (playingId === audio.id) {
        stopPreview();
        return;
      }
      stopPreview();
      if (!audio.previewUrl) {
        return;
      }
      const newPlayer = new Audio(audio.previewUrl);
      newPlayer.onended = () => setPlayingId('');
      newPlayer.play();
      player.current = newPlayer;
      setPlayingId(audio.id);
    },
    [playingId, stopPreview]
  );

  const selectAudio = useCallback(
    (audio: AudioResult) => {
      stopPreview();
      setOpen(false);
      emit({
        id: audio.id,
        title: audio.title,
        artist: audio.artist,
        image: audio.image,
        audio_volume: 100,
        video_volume: 100,
      });
    },
    [emit, stopPreview]
  );

  const removeAudio = useCallback(() => {
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

  if (disabled) {
    return (
      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">{label}</div>
        <div>
          <div
            data-tooltip-id="tooltip"
            data-tooltip-content={t(
              'instagram_audio_facebook_login_only',
              'Only available on Instagram with Facebook Login'
            )}
            className="h-[42px] px-[16px] inline-flex items-center cursor-not-allowed opacity-50 bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
          >
            {t('instagram_add_audio', 'Add audio')}
          </div>
        </div>
      </div>
    );
  }

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
              onClick={removeAudio}
            >
              X
            </div>
          </div>
          <div className="flex gap-[18px]">
            <div className="flex-1 flex flex-col gap-[6px]">
              <div className="text-[12px]">
                {t('instagram_audio_volume', 'Audio volume')} (
                {value.audio_volume ?? 100})
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={value.audio_volume ?? 100}
                onChange={(e) =>
                  changeVolume('audio_volume', +e.target.value)
                }
              />
            </div>
            <div className="flex-1 flex flex-col gap-[6px]">
              <div className="text-[12px]">
                {t('instagram_video_volume', 'Original video volume')} (
                {value.video_volume ?? 100})
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={value.video_volume ?? 100}
                onChange={(e) =>
                  changeVolume('video_volume', +e.target.value)
                }
              />
            </div>
          </div>
        </div>
      ) : !open ? (
        <div>
          <div
            className="h-[42px] px-[16px] inline-flex items-center cursor-pointer bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
            onClick={() => setOpen(true)}
          >
            {t('instagram_add_audio', 'Add audio')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[6px]">
          <div className="flex gap-[6px]">
            <Select
              label=""
              name="instagram_audio_type"
              disableForm={true}
              hideErrors={true}
              value={audioType}
              onChange={(e) =>
                setAudioType(e.target.value as 'music' | 'original_sound')
              }
            >
              <option value="music">{t('instagram_music', 'Music')}</option>
              <option value="original_sound">
                {t('instagram_original_sound', 'Original sound')}
              </option>
            </Select>
            <div className="flex-1 h-[42px] bg-newBgColorInner border-newTableBorder border rounded-[8px] flex items-center">
              <input
                className="h-full w-full bg-transparent outline-none px-[16px] text-[14px] text-textColor placeholder-textColor"
                placeholder={t(
                  'instagram_search_audio',
                  'Search audio (empty shows trending)'
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
            ) : !results.length ? (
              <div className="p-[12px] text-[14px] opacity-70">
                {t('instagram_no_audio_found', 'No audio found')}
              </div>
            ) : (
              results.map((audio) => (
                <div
                  key={audio.id}
                  className="flex items-center gap-[12px] p-[8px] hover:bg-newTableBorder cursor-pointer"
                  onClick={() => selectAudio(audio)}
                >
                  {!!audio.image && (
                    <img
                      src={audio.image}
                      className="w-[36px] h-[36px] rounded-[8px] object-cover"
                    />
                  )}
                  <div className="flex-1 flex flex-col">
                    <div className="text-[14px]">{audio.title}</div>
                    <div className="text-[12px] opacity-70">
                      {[audio.artist, formatDuration(audio.duration)]
                        .filter((f) => f)
                        .join(' · ')}
                    </div>
                  </div>
                  {!!audio.previewUrl && (
                    <div
                      className={clsx(
                        'px-[12px] text-[12px] opacity-70 hover:opacity-100',
                        playingId === audio.id && 'opacity-100'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePreview(audio);
                      }}
                    >
                      {playingId === audio.id
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
