'use client';

import { Slider } from '@gitroom/react/form/slider';
import { Button } from '@gitroom/react/form/button';
import { tagsList } from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';
import { Options } from '@gitroom/frontend/components/marketplace/buyer';
import { useCallback, useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';

export const Seller = () => {
  const fetch = useFetch();
  const [loading, setLoading] = useState<boolean>(true);
  const [keys, setKeys] = useState<
    Array<{ key: string; id: string; user: string }>
  >([]);
  const [connectedLoading, setConnectedLoading] = useState(false);
  const [state, setState] = useState(true);

  const accountInformation = useCallback(async () => {
    const account = await (
      await fetch('/marketplace/account', {
        method: 'GET',
      })
    ).json();

    setState(account.marketplace);
    return account;
  }, []);

  const onChange = useCallback((key: string, state: boolean) => {
    fetch('/marketplace/item', {
      method: 'POST',
      body: JSON.stringify({
        key,
        state,
      }),
    });
  }, []);

  const connectBankAccount = useCallback(async () => {
    setConnectedLoading(true);
    const { url } = await (
      await fetch('/marketplace/bank', {
        method: 'GET',
      })
    ).json();

    window.location.href = url;
  }, []);

  const loadItems = useCallback(async () => {
    const data = await (
      await fetch('/marketplace/item', {
        method: 'GET',
      })
    ).json();

    setKeys(data);
    setLoading(false);
  }, []);

  const changeMarketplace = useCallback(async (value: string) => {
    await fetch('/marketplace/active', {
      method: 'POST',
      body: JSON.stringify({
        active: value === 'on',
      }),
    });
    setState(!state);
  }, [state]);

  const { data } = useSWR('/marketplace/account', accountInformation);

  useEffect(() => {
    loadItems();
  }, []);

  if (loading) {
    return <></>;
  }

  return (
    <div className="flex mt-[29px] w-full gap-[26px]">
      <div className="w-[328px] flex flex-col gap-[16px]">
        <h2 className="text-[20px]">Seller Mode</h2>
        <div className="flex p-[24px] bg-sixth rounded-[4px] border border-[#172034] flex-col items-center gap-[16px]">
          <div className="w-[64px] h-[64px] bg-[#D9D9D9] rounded-full" />
          <div className="text-[24px]">John Smith</div>
          {data?.connectedAccount && (
            <div className="flex gap-[16px] items-center pb-[8px]">
              <Slider fill={true} value={state ? 'on' : 'off'} onChange={changeMarketplace} />
              <div className="text-[18px]">Active</div>
            </div>
          )}
          <div className="border-t border-t-[#425379] w-full" />
          <div className="w-full">
            <Button
              className="w-full"
              onClick={connectBankAccount}
              loading={connectedLoading}
            >
              {!data?.account ? 'Connect Bank Account' : 'Update Bank Account'}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 flex gap-[16px] flex-col">
        <h2 className="text-[20px]">Details</h2>
        <div className="bg-sixth rounded-[4px] border border-[#172034]">
          {tagsList.map((tag) => (
            <Options
              rows={3}
              key={tag.key}
              onChange={onChange}
              preSelected={keys.map((key) => key.key)}
              search={false}
              options={tag.options}
              title={tag.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
