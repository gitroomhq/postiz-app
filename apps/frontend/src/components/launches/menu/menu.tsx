import { FC, useCallback, useState } from 'react';
import { useClickOutside } from '@mantine/hooks';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import interClass from '@gitroom/react/helpers/inter.font';
import { useModals } from '@mantine/modals';
import { TimeTable } from '@gitroom/frontend/components/launches/time.table';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { BotPicture } from '@gitroom/frontend/components/launches/bot.picture';

import { ReactComponent as VDotsSvg } from '@gitroom/frontend/assets/vdots.svg';
import { ReactComponent as RedBinSvg } from '@gitroom/frontend/assets/red-bin.svg';
import { ReactComponent as GreenCheckCloudSvg } from '@gitroom/frontend/assets/green-check-c.svg';
import { ReactComponent as GreenClockSvg } from '@gitroom/frontend/assets/green-clock.svg';
import { ReactComponent as GreenImageSvg } from '@gitroom/frontend/assets/green-image.svg';
import { ReactComponent as CancelSvg } from '@gitroom/frontend/assets/cancel.svg';

export const Menu: FC<{
  canEnable: boolean;
  canDisable: boolean;
  canChangeProfilePicture: boolean;
  canChangeNickName: boolean;
  id: string;
  mutate: () => void;
  onChange: (shouldReload: boolean) => void;
}> = (props) => {
  const {
    canEnable,
    canDisable,
    id,
    onChange,
    mutate,
    canChangeProfilePicture,
    canChangeNickName,
  } = props;
  const fetch = useFetch();
  const { integrations } = useCalendar();
  const toast = useToaster();
  const modal = useModals();
  const [show, setShow] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => {
    setShow(false);
  });

  const changeShow = useCallback(() => {
    setShow(!show);
  }, [show]);

  const disableChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        'Are you sure you want to disable this channel?',
        'Disable Channel'
      ))
    ) {
      return;
    }
    await fetch('/integrations/disable', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    toast.show('Channel Disabled', 'success');
    setShow(false);
    onChange(false);
  }, []);

  const deleteChannel = useCallback(async () => {
    if (
      !(await deleteDialog(
        'Are you sure you want to delete this channel?',
        'Delete Channel'
      ))
    ) {
      return;
    }
    const deleteIntegration = await fetch('/integrations', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (deleteIntegration.status === 406) {
      toast.show(
        'You have to delete all the posts associated with this channel before deleting it',
        'warning'
      );
      return;
    }

    toast.show('Channel Deleted', 'success');
    setShow(false);
    onChange(true);
  }, []);

  const enableChannel = useCallback(async () => {
    await fetch('/integrations/enable', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    toast.show('Channel Enabled', 'success');
    setShow(false);
    onChange(false);
  }, []);

  const editTimeTable = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
    modal.openModal({
      classNames: {
        modal: 'w-[100%] max-w-[600px] bg-transparent text-textColor',
      },
      size: '100%',
      withCloseButton: false,
      closeOnEscape: false,
      closeOnClickOutside: false,
      children: <TimeTable integration={findIntegration!} mutate={mutate} />,
    });
    setShow(false);
  }, [integrations]);

  const changeBotPicture = useCallback(() => {
    const findIntegration = integrations.find(
      (integration) => integration.id === id
    );
    modal.openModal({
      classNames: {
        modal: 'w-[100%] max-w-[600px] bg-transparent text-textColor',
      },
      size: '100%',
      withCloseButton: false,
      closeOnEscape: true,
      closeOnClickOutside: true,
      children: (
        <BotPicture
          canChangeProfilePicture={canChangeProfilePicture}
          canChangeNickName={canChangeNickName}
          integration={findIntegration!}
          mutate={mutate}
        />
      ),
    });
    setShow(false);
  }, [integrations]);

  return (
    <div
      className="cursor-pointer relative select-none"
      onClick={changeShow}
      ref={ref}
    >
      <VDotsSvg />
      {show && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-[100%] left-0 p-[8px] px-[20px] bg-fifth flex flex-col gap-[16px] z-[100] rounded-[8px] border border-tableBorder ${interClass} text-nowrap`}
        >
          {(canChangeProfilePicture || canChangeNickName) && (
            <div
              className="flex gap-[12px] items-center"
              onClick={changeBotPicture}
            >
              <div>
                <GreenImageSvg />
              </div>
              <div className="text-[12px]">
                Change Bot{' '}
                {[
                  canChangeProfilePicture && 'Picture',
                  canChangeNickName && 'Nickname',
                ]
                  .filter((f) => f)
                  .join(' / ')}
              </div>
            </div>
          )}
          <div className="flex gap-[12px] items-center" onClick={editTimeTable}>
            <div>
              <GreenClockSvg />
            </div>
            <div className="text-[12px]">Edit Time Slots</div>
          </div>
          {canEnable && (
            <div
              className="flex gap-[12px] items-center"
              onClick={enableChannel}
            >
              <div>
                <GreenCheckCloudSvg />
              </div>
              <div className="text-[12px]">Enable Channel</div>
            </div>
          )}

          {canDisable && (
            <div
              className="flex gap-[12px] items-center"
              onClick={disableChannel}
            >
              <div>
                <CancelSvg />
              </div>
              <div className="text-[12px]">Disable Channel</div>
            </div>
          )}

          <div className="flex gap-[12px] items-center" onClick={deleteChannel}>
            <div>
              <RedBinSvg />
            </div>
            <div className="text-[12px]">Delete</div>
          </div>
        </div>
      )}
    </div>
  );
};
