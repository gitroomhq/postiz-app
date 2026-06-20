'use client';

import { FC, FormEvent, useCallback, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Input } from '@gitroom/react/form/input';
import { useDebouncedCallback } from 'use-debounce';
import { useWatch } from 'react-hook-form';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
export const Subreddit: FC<{
  onChange: (event: {
    target: {
      name: string;
      value: {
        id: string;
        subreddit: string;
        title: string;
        name: string;
        url: string;
        body: string;
        media: any[];
      };
    };
  }) => void;
  name: string;
}> = (props) => {
  const { onChange, name } = props;
  const state = useSettings();
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
    onChange({
      target: {
        name,
        value: {
          id: String(result.id),
          subreddit: result.name,
          title: '',
          name: '',
          url: '',
          body: '',
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
            label="Community"
            name="subreddit"
          />
          <Input
            error={errors?.title?.message}
            value={value.title}
            disableForm={true}
            label="Title"
            name="title"
            onChange={setTitle}
          />
          <Input
            error={errors?.url?.message}
            value={value.url}
            label="URL"
            name="url"
            disableForm={true}
            onChange={setURL}
          />
        </>
      ) : (
        <div className="relative">
          <Input
            placeholder="Community"
            name="search"
            label="Search Community"
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
