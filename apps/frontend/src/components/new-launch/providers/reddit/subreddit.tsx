'use client';

import { FC, FormEvent, useCallback, useMemo, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Input } from '@gitroom/react/form/input';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@gitroom/react/form/button';
import clsx from 'clsx';
import { MultiMediaComponent } from '@gitroom/frontend/components/media/media.component';
import { useWatch } from 'react-hook-form';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Canonical } from '@gitroom/react/form/canonical';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
export const RenderOptions: FC<{
  options: Array<'self' | 'link' | 'media'>;
  onClick: (current: 'self' | 'link' | 'media') => void;
  value: 'self' | 'link' | 'media';
}> = (props) => {
  const { options, onClick, value } = props;
  const mapValues = useMemo(() => {
    return options.map((p) => ({
      children: (
        <>
          {p === 'self'
            ? 'Post'
            : p === 'link'
            ? 'Link'
            : p === 'media'
            ? 'Media'
            : ''}
        </>
      ),
      id: p,
      onClick: () => onClick(p),
    }));
  }, [options]);
  return (
    <div className="flex">
      {mapValues.map((p) => (
        <Button
          className={clsx('flex-1', p.id !== value && 'bg-secondary')}
          key={p.id}
          {...p}
        />
      ))}
    </div>
  );
};
export const Subreddit: FC<{
  onChange: (event: {
    target: {
      name: string;
      value: {
        id: string;
        name: string;
      };
    };
  }) => void;
  name: string;
}> = (props) => {
  const { onChange, name } = props;
  const state = useSettings();
  const t = useT();

  const { date } = useIntegration();
  const dummy = useLaunchStore((state) => state.dummy);
  const split = name.split('.');
  const [loading, setLoading] = useState(false);
  // @ts-ignore
  const errors = state?.formState?.errors?.[split?.[0]]?.[split?.[1]]?.value;
  const [results, setResults] = useState([]);
  const func = useCustomProviderFunction();
  const value = useWatch({
    name,
  });
  const [searchValue, setSearchValue] = useState('');
  const setResult = (result: { id: string; name: string }) => async () => {
    setLoading(true);
    setSearchValue('');
    const restrictions = await func.get('restrictions', {
      subreddit: result.name,
    });
    onChange({
      target: {
        name,
        value: {
          ...restrictions,
          type: restrictions.allow[0],
          media: [],
        },
      },
    });
    setLoading(false);
  };
  const setTitle = useCallback(
    (e: any) => {
      onChange({
        target: {
          name,
          value: {
            ...value,
            title: e.target.value,
          },
        },
      });
    },
    [value]
  );
  const setType = useCallback(
    (e: string) => {
      onChange({
        target: {
          name,
          value: {
            ...value,
            type: e,
          },
        },
      });
    },
    [value]
  );
  const setMedia = useCallback(
    (e: any) => {
      onChange({
        target: {
          name,
          value: {
            ...value,
            media: e.target.value.map((p: any) => p),
          },
        },
      });
    },
    [value]
  );
  const setURL = useCallback(
    (e: any) => {
      onChange({
        target: {
          name,
          value: {
            ...value,
            url: e.target.value,
          },
        },
      });
    },
    [value]
  );
  const setFlair = useCallback(
    (e: any) => {
      onChange({
        target: {
          name,
          value: {
            ...value,
            flair: value.flairs.find((p: any) => p.id === e.target.value),
          },
        },
      });
    },
    [value]
  );
  const search = useDebouncedCallback(
    useCallback(async (e: FormEvent<HTMLInputElement>) => {
      // @ts-ignore
      setResults([]);
      // @ts-ignore
      if (!e.target.value) {
        return;
      }
      // @ts-ignore
      const results = await func.get('subreddits', { word: e.target.value });
      // @ts-ignore
      setResults(results);
    }, []),
    500
  );
  return (
    <div className="bg-primary p-[20px]">
      {value?.subreddit ? (
        <>
          <Input
            error={errors?.subreddit?.message}
            disableForm={true}
            value={value.subreddit}
            readOnly={true}
            label="Subreddit"
            name="subreddit"
          />
          <div className="mb-[12px]">
            <RenderOptions
              value={value.type}
              options={value.allow}
              onClick={setType}
            />
          </div>
          <Input
            error={errors?.title?.message}
            value={value.title}
            disableForm={true}
            label="Title"
            name="title"
            onChange={setTitle}
          />
          <Select
            error={errors?.flair?.message}
            onChange={setFlair}
            value={value?.flair?.id}
            disableForm={true}
            label="Flair"
            name="flair"
          >
            <option value="">{t('select_flair', '--Select Flair--')}</option>
            {value.flairs.map((f: any) => (
              <option key={f.name} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          {value.type === 'link' && (
            <Canonical
              date={date}
              error={errors?.url?.message}
              value={value.url}
              label="URL"
              name="url"
              disableForm={true}
              onChange={setURL}
            />
          )}
        </>
      ) : (
        <div className="relative">
          <Input
            placeholder="/r/selfhosted"
            name="search"
            label="Search Subreddit"
            readOnly={loading}
            value={searchValue}
            error={errors?.message}
            disableForm={true}
            onInput={async (e) => {
              // @ts-ignore
              setSearchValue(e.target.value);
              await search(e);
            }}
          />
          {!!results.length && !loading && (
            <div className="z-[400] w-full absolute bg-input -mt-[20px] outline-none border-fifth border cursor-pointer">
              {results.map((r: { id: string; name: string }) => (
                <div
                  onClick={setResult(r)}
                  key={r.id}
                  className="px-[16px] py-[5px] hover:bg-secondary"
                >
                  {r.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
