import { Input } from '@gitroom/react/form/input';
import { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { Select } from '@gitroom/react/form/select';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';

export const Subscription = () => {
  const fetch = useFetch();
  const addSubscription: ChangeEventHandler<HTMLSelectElement> = useCallback(
    async (e) => {
      const value = e.target.value;
      if (
        await deleteDialog(
          'Are you sure you want to add a user subscription?',
          'Add'
        )
      ) {
        await fetch('/billing/add-subscription', {
          method: 'POST',
          body: JSON.stringify({ subscription: value }),
        });

        window.location.reload();
      }
    },
    []
  );

  return (
    <Select
      onChange={addSubscription}
      hideErrors={true}
      disableForm={true}
      name="sub"
      label=""
      value=""
      className="text-black"
    >
      <option>-- ADD FREE SUBSCRIPTION --</option>
      {Object.keys(pricing)
        .filter((f) => !f.includes('FREE'))
        .map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
    </Select>
  );
};
export const Impersonate = () => {
  const fetch = useFetch();
  const [name, setName] = useState('');
  const user = useUser();

  const load = useCallback(async () => {
    if (!name) {
      return [];
    }

    const value = await (await fetch(`/user/impersonate?name=${name}`)).json();
    return value;
  }, [name]);

  const stopImpersonating = useCallback(async () => {
    await fetch(`/user/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ id: '' }),
    });

    window.location.reload();
  }, []);

  const setUser = useCallback(
    (userId: string) => async () => {
      await fetch(`/user/impersonate`, {
        method: 'POST',
        body: JSON.stringify({ id: userId }),
      });

      window.location.reload();
    },
    []
  );

  const { data } = useSWR(`/impersonate-${name}`, load, {
    refreshWhenHidden: false,
    revalidateOnMount: true,
    revalidateOnReconnect: false,
    revalidateOnFocus: false,
    refreshWhenOffline: false,
    revalidateIfStale: false,
    refreshInterval: 0,
  });

  const mapData = useMemo(() => {
    return data?.map(
      (curr: any) => ({
        id: curr.id,
        name: curr.user.name,
        email: curr.user.email,
      }),
      []
    );
  }, [data]);

  return (
    <div className="md:px-[23px]">
      <div className="bg-forth h-[52px] flex justify-center items-center border-input border rounded-[8px]">
        <div className="relative flex flex-col w-[600px]">
          <div className="relative z-[999]">
            {user?.impersonate ? (
              <div className="text-center flex justify-center items-center gap-[20px]">
                <div>Currently Impersonating</div>
                <div>
                  <div
                    className="px-[10px] rounded-[4px] bg-red-500 text-textColor cursor-pointer"
                    onClick={stopImpersonating}
                  >
                    X
                  </div>
                </div>
                {user?.tier?.current === 'FREE' && <Subscription />}
              </div>
            ) : (
              <Input
                autoComplete="off"
                placeholder="Write the user details"
                name="impersonate"
                disableForm={true}
                label=""
                removeError={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </div>
          {!!data?.length && (
            <>
              <div
                className="bg-primary/80 fixed left-0 top-0 w-full h-full z-[998]"
                onClick={() => setName('')}
              />
              <div className="absolute top-[100%] w-full left-0 bg-sixth border border-customColor6 text-textColor z-[999]">
                {mapData?.map((user: any) => (
                  <div
                    onClick={setUser(user.id)}
                    key={user.id}
                    className="p-[10px] border-b border-customColor6 hover:bg-tableBorder cursor-pointer"
                  >
                    user: {user.id.split('-').at(-1)} - {user.name} -{' '}
                    {user.email}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
