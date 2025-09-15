import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import React, { FC, FormEventHandler, useCallback, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
export const BotPicture: FC<{
  integration: Integrations;
  canChangeProfilePicture: boolean;
  canChangeNickName: boolean;
  mutate: () => void;
}> = (props) => {
  const t = useT();
  const modal = useModals();
  const toast = useToaster();
  const [nick, setNickname] = useState(props.integration.name);
  const [picture, setPicture] = useState(
    props.integration.picture || '/no-picture.jpg'
  );
  const fetch = useFetch();
  const submitForm: FormEventHandler<HTMLFormElement> = useCallback(
    async (e) => {
      e.preventDefault();
      await fetch(`/integrations/${props.integration.id}/nickname`, {
        method: 'POST',
        body: JSON.stringify({
          name: nick,
          picture,
        }),
      });
      props.mutate();
      toast.show('Updated', 'success');
      modal.closeAll();
    },
    [nick, picture, props.mutate]
  );
  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      setPicture(values.path);
    });
  }, []);
  return (
    <div className="rounded-[4px] border border-customColor6 bg-sixth px-[16px] pb-[16px] relative w-full">
      <TopTitle title={`Change Bot Picture`} />
      <button
        className="outline-none absolute end-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
        type="button"
        onClick={() => modal.closeAll()}
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

      <div className="mt-[16px]">
        <form onSubmit={submitForm} className="gap-[50px] flex flex-col">
          {props.canChangeProfilePicture && (
            <div className="flex items-center gap-[20px]">
              <img
                src={picture}
                alt="Bot Picture"
                className="w-[100px] h-[100px] rounded-full"
              />
              <Button type="button" onClick={openMedia}>
                {t('upload', 'Upload')}
              </Button>
            </div>
          )}
          {props.canChangeNickName && (
            <Input
              value={nick}
              onChange={(e) => setNickname(e.target.value)}
              name="Nickname"
              label="Nickname"
              placeholder=""
              disableForm={true}
            />
          )}

          <div className="mt-[50px]">
            <Button type="submit">{t('save', 'Save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
