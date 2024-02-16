'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import Image from 'next/image';
import clsx from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import { usePreventWindowUnload } from '@gitroom/react/helpers/use.prevent.window.unload';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useModals } from '@mantine/modals';
import { ShowAllProviders } from '@gitroom/frontend/components/launches/providers/show.all.providers';
import { useHideTopEditor } from '@gitroom/frontend/components/launches/helpers/use.hide.top.editor';
import { Button } from '@gitroom/react/form/button';
import { IntegrationContext } from '@gitroom/frontend/components/launches/helpers/use.integration';
import {
  getValues,
  resetValues,
} from '@gitroom/frontend/components/launches/helpers/use.values';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  useMoveToIntegration,
  useMoveToIntegrationListener,
} from '@gitroom/frontend/components/launches/helpers/use.move.to.integration';

export const PickPlatforms: FC<{
  integrations: Integrations[];
  selectedIntegrations: Integrations[];
  onChange: (integrations: Integrations[]) => void;
  singleSelect: boolean;
}> = (props) => {
  const { integrations, selectedIntegrations, onChange } = props;
  const [selectedAccounts, setSelectedAccounts] =
    useState<Integrations[]>(selectedIntegrations);

  useEffect(() => {
    if (
      props.singleSelect &&
      selectedAccounts.length &&
      integrations.indexOf(selectedAccounts?.[0]) === -1
    ) {
      addPlatform(integrations[0])();
    }
  }, [integrations, selectedAccounts]);

  useMoveToIntegrationListener(props.singleSelect, (identifier) => {
    const findIntegration = integrations.find(
      (p) => p.identifier === identifier
    );
    if (findIntegration) {
      addPlatform(findIntegration)();
    }
  });

  const addPlatform = useCallback(
    (integration: Integrations) => async () => {
      if (props.singleSelect) {
        onChange([integration]);
        setSelectedAccounts([integration]);
        return;
      }
      if (selectedAccounts.includes(integration)) {
        const changedIntegrations = selectedAccounts.filter(
          ({ id }) => id !== integration.id
        );

        if (
          !props.singleSelect &&
          !(await deleteDialog(
            'Are you sure you want to remove this platform?'
          ))
        ) {
          return;
        }
        onChange(changedIntegrations);
        setSelectedAccounts(changedIntegrations);
      } else {
        const changedIntegrations = [...selectedAccounts, integration];
        onChange(changedIntegrations);
        setSelectedAccounts(changedIntegrations);
      }
    },
    [selectedAccounts]
  );
  return (
    <div className="flex">
      {integrations.map((integration) =>
        !props.singleSelect ? (
          <div
            key={integration.id}
            className="flex gap-[8px] items-center mr-[10px]"
          >
            <div
              onClick={addPlatform(integration)}
              className={clsx(
                'cursor-pointer relative w-[34px] h-[34px] rounded-full flex justify-center items-center bg-fifth filter transition-all duration-500',
                selectedAccounts.findIndex((p) => p.id === integration.id) ===
                  -1
                  ? 'grayscale opacity-65'
                  : 'grayscale-0'
              )}
            >
              <img
                src={integration.picture}
                className="rounded-full"
                alt={integration.identifier}
                width={32}
                height={32}
              />
              <Image
                src={`/icons/platforms/${integration.identifier}.png`}
                className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                alt={integration.identifier}
                width={20}
                height={20}
              />
            </div>
          </div>
        ) : (
          <div key={integration.id} className="flex w-full">
            <div
              onClick={addPlatform(integration)}
              className={clsx(
                'cursor-pointer flex-1 relative h-[40px] flex justify-center items-center bg-fifth filter transition-all duration-500',
                selectedAccounts.findIndex((p) => p.id === integration.id) ===
                  -1
                  ? 'bg-sixth'
                  : 'bg-forth'
              )}
            >
              <div className="flex items-center justify-center gap-[10px]">
                <div className="relative">
                  <img
                    src={integration.picture}
                    className="rounded-full"
                    alt={integration.identifier}
                    width={32}
                    height={32}
                  />
                  <Image
                    src={`/icons/platforms/${integration.identifier}.png`}
                    className="rounded-full absolute z-10 -bottom-[5px] -right-[5px] border border-fifth"
                    alt={integration.identifier}
                    width={20}
                    height={20}
                  />
                </div>
                <div>{integration.name}</div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export const PreviewComponent: FC<{
  integrations: Integrations[];
  editorValue: string[];
}> = (props) => {
  const { integrations, editorValue } = props;
  const [selectedIntegrations, setSelectedIntegrations] = useState([
    integrations[0],
  ]);

  useEffect(() => {
    if (integrations.indexOf(selectedIntegrations[0]) === -1) {
      setSelectedIntegrations([integrations[0]]);
    }
  }, [integrations, selectedIntegrations]);
  return (
    <div>
      <PickPlatforms
        integrations={integrations}
        selectedIntegrations={selectedIntegrations}
        onChange={setSelectedIntegrations}
        singleSelect={true}
      />
      <IntegrationContext.Provider
        value={{ value: editorValue, integration: selectedIntegrations?.[0] }}
      >
        <ShowAllProviders
          value={editorValue}
          integrations={integrations}
          selectedProvider={selectedIntegrations?.[0]}
        />
      </IntegrationContext.Provider>
    </div>
  );
};
export const AddEditModal: FC<{
  date: dayjs.Dayjs;
  integrations: Integrations[];
}> = (props) => {
  const { date, integrations } = props;

  // selected integrations to allow edit
  const [selectedIntegrations, setSelectedIntegrations] = useState<
    Integrations[]
  >([]);

  // value of each editor
  const [value, setValue] = useState<string[]>(['']);

  const fetch = useFetch();

  // prevent the window exit by mistake
  usePreventWindowUnload(true);

  // hook to move the settings in the right place to fix missing fields
  const moveToIntegration = useMoveToIntegration();

  // hook to test if the top editor should be hidden
  const showHide = useHideTopEditor();

  // hook to open a new modal
  const modal = useModals();

  // if the user exit the popup we reset the global variable with all the values
  useEffect(() => {
    return () => {
      resetValues();
    };
  }, []);

  // Change the value of the global editor
  const changeValue = useCallback(
    (index: number) => (newValue: string) => {
      return setValue((prev) => {
        prev[index] = newValue;
        return [...prev];
      });
    },
    [value]
  );

  // Add another editor
  const addValue = useCallback(
    (index: number) => () => {
      setValue((prev) => {
        prev.splice(index + 1, 0, '');
        return [...prev];
      });
    },
    [value]
  );

  // override the close modal to ask the user if he is sure to close
  const askClose = useCallback(async () => {
    if (
      await deleteDialog(
        'Are you sure you want to close this modal? (all data will be lost)',
        'Yes, close it!'
      )
    ) {
      modal.closeAll();
    }
  }, []);

  // function to send to the server and save
  const schedule = useCallback(async () => {
    const values = getValues();
    const allKeys = Object.keys(values).map((v) => ({
      integration: integrations.find((p) => p.id === v),
      value: values[v].posts,
      valid: values[v].isValid,
      settings: values[v].settings(),
    }));

    for (const key of allKeys) {
      if (!key.valid) {
        moveToIntegration(key?.integration?.identifier!);
        return;
      }
    }

    await fetch('/posts', {
      method: 'POST',
      body: JSON.stringify({
        date: date.utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: allKeys,
      }),
    });
  }, []);

  return (
    <>
      <button
        onClick={askClose}
        className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root bg-black hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
      >
        <svg
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
        >
          <path
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
      <div className="flex flex-col gap-[20px]">
        <PickPlatforms
          integrations={integrations}
          selectedIntegrations={[]}
          singleSelect={false}
          onChange={setSelectedIntegrations}
        />
        {!showHide.hideTopEditor ? (
          <>
            {value.map((p, index) => (
              <>
                <MDEditor
                  key={`edit_${index}`}
                  height={value.length > 1 ? 150 : 500}
                  value={p}
                  preview="edit"
                  // @ts-ignore
                  onChange={changeValue(index)}
                />
                <div>
                  <Button onClick={addValue(index)}>Add post</Button>
                </div>
              </>
            ))}
          </>
        ) : (
          <div className="h-[100px] flex justify-center items-center bg-sixth border-tableBorder border-2">
            Global Editor Hidden
          </div>
        )}
        {!!selectedIntegrations.length && (
          <PreviewComponent
            integrations={selectedIntegrations}
            editorValue={value}
          />
        )}
        <Button onClick={schedule}>Schedule</Button>
      </div>
    </>
  );
};
