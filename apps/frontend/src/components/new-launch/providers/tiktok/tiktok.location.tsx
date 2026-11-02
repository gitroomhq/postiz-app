'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

interface LocationResult {
  id: string;
  name: string;
  address: string;
}

interface SelectedLocation {
  id: string;
  name: string;
  address?: string;
}

export const TikTokLocationSelector: FC<{
  name: string;
  label: string;
  onChange: (event: {
    target: {
      value: SelectedLocation | undefined;
      name: string;
    };
  }) => void;
}> = (props) => {
  const { onChange, name, label } = props;
  const t = useT();
  const { getValues } = useSettings();
  const customFunc = useCustomProviderFunction();
  const [value, setValue] = useState<SelectedLocation | undefined>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const settings = getValues()[name];
    if (settings?.id) {
      setValue(settings);
    }
  }, []);

  const emit = useCallback(
    (newValue: SelectedLocation | undefined) => {
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
    if (!open || !query) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const search = setTimeout(async () => {
      try {
        const list = await customFunc.get('locationSearch', { q: query });
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
  }, [query, open]);

  const selectLocation = useCallback(
    (location: LocationResult) => {
      setOpen(false);
      emit({
        id: location.id,
        name: location.name,
        address: location.address,
      });
    },
    [emit]
  );

  const removeLocation = useCallback(() => {
    emit(undefined);
  }, [emit]);

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="text-[14px]">{label}</div>
      {value?.id ? (
        <div className="flex items-center gap-[12px] bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px]">
          <div className="flex-1 flex flex-col">
            <div className="text-[14px]">{value.name}</div>
            {!!value.address && (
              <div className="text-[12px] opacity-70">{value.address}</div>
            )}
          </div>
          <div
            className="cursor-pointer text-[14px] opacity-70 hover:opacity-100"
            onClick={removeLocation}
          >
            X
          </div>
        </div>
      ) : !open ? (
        <div>
          <div
            className="h-[42px] px-[16px] inline-flex items-center cursor-pointer bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
            onClick={() => setOpen(true)}
          >
            {t('tiktok_add_location', 'Add location')}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[6px]">
          <div className="flex gap-[6px]">
            <div className="flex-1 h-[42px] bg-newBgColorInner border-newTableBorder border rounded-[8px] flex items-center">
              <input
                className="h-full w-full bg-transparent outline-none px-[16px] text-[14px] text-textColor placeholder-textColor"
                placeholder={t('tiktok_search_location', 'Search location')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div
              className="h-[42px] px-[16px] flex items-center cursor-pointer bg-newBgColorInner border-newTableBorder border rounded-[8px] text-[14px]"
              onClick={() => setOpen(false)}
            >
              {t('cancel', 'Cancel')}
            </div>
          </div>
          {!!query && (
            <div className="max-h-[250px] overflow-y-auto flex flex-col bg-newBgColorInner border-newTableBorder border rounded-[8px]">
              {loading ? (
                <div className="p-[12px] text-[14px] opacity-70">
                  {t('loading', 'Loading...')}
                </div>
              ) : !results.length ? (
                <div className="p-[12px] text-[14px] opacity-70">
                  {t('tiktok_no_location_found', 'No location found')}
                </div>
              ) : (
                results.map((location) => (
                  <div
                    key={location.id}
                    className="flex flex-col p-[8px] hover:bg-newTableBorder cursor-pointer"
                    onClick={() => selectLocation(location)}
                  >
                    <div className="text-[14px]">{location.name}</div>
                    {!!location.address && (
                      <div className="text-[12px] opacity-70">
                        {location.address}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
