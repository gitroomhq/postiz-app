'use client';

import { useModals } from '@mantine/modals';
import React, { FC, Ref, useCallback, useEffect, useMemo } from 'react';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { Textarea } from '@gitroom/react/form/textarea';
import { FormProvider, useForm } from 'react-hook-form';
import { showMediaBox } from '@gitroom/frontend/components/media/media.component';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { UserDetailDto } from '@gitroom/nestjs-libraries/dtos/users/user.details.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { TeamsComponent } from '@gitroom/frontend/components/settings/teams.component';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';
import { useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';

import { ReactComponent as CloseXSvg } from '@gitroom/frontend/assets/close-x.svg';
import { ReactComponent as UploadSvg } from '@gitroom/frontend/assets/upload.svg';
import { ReactComponent as RemoveSvg } from '@gitroom/frontend/assets/remove.svg';
import { ReactComponent as GearSvg } from '@gitroom/frontend/assets/gear.svg';

export const SettingsPopup: FC<{ getRef?: Ref<any> }> = (props) => {
  const { isGeneral } = useVariables();
  const { getRef } = props;
  const fetch = useFetch();
  const toast = useToaster();
  const swr = useSWRConfig();
  const user = useUser();

  const resolver = useMemo(() => {
    return classValidatorResolver(UserDetailDto);
  }, []);
  const form = useForm({ resolver });
  const picture = form.watch('picture');
  const modal = useModals();
  const close = useCallback(() => {
    return modal.closeAll();
  }, []);

  const url = useSearchParams();
  const showLogout = !url.get('onboarding') || user?.tier?.current === "FREE";

  const loadProfile = useCallback(async () => {
    const personal = await (await fetch('/user/personal')).json();
    form.setValue('fullname', personal.name || '');
    form.setValue('bio', personal.bio || '');
    form.setValue('picture', personal.picture);
  }, []);

  const openMedia = useCallback(() => {
    showMediaBox((values) => {
      form.setValue('picture', values);
    });
  }, []);

  const remove = useCallback(() => {
    form.setValue('picture', null);
  }, []);

  const submit = useCallback(async (val: any) => {
    await fetch('/user/personal', {
      method: 'POST',
      body: JSON.stringify(val),
    });

    if (getRef) {
      return;
    }

    toast.show('Profile updated');
    swr.mutate('/marketplace/account');
    close();
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        {!!getRef && (
          <button type="submit" className="hidden" ref={getRef}></button>
        )}
        <div
          className={clsx(
            'w-full max-w-[920px] mx-auto bg-sixth gap-[24px] flex flex-col relative',
            !getRef && 'p-[32px] rounded-[4px] border border-customColor6'
          )}
        >
          {!getRef && (
            <button
              onClick={close}
              className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
              type="button"
            >
              {/* <!-- Heroicon name: x --> */}
              <CloseXSvg />
            </button>
          )}
          {!getRef && (
            <div className="text-[24px] font-[600]">Profile Settings</div>
          )}
          <div className="flex flex-col gap-[4px]">
            <div className="text-[20px] font-[500]">Profile</div>
            <div className="text-[14px] text-customColor18 font-[400]">
              Add profile information
            </div>
          </div>
          <div className="rounded-[4px] border border-customColor6 p-[24px] flex flex-col">
            <div className="flex justify-between items-center">
              <div className="w-[455px]">
                <Input label="Full Name" name="fullname" />
              </div>
              <div className="flex gap-[8px] mb-[10px]">
                <div className="w-[48px] h-[48px] rounded-full bg-customColor38">
                  {!!picture?.path && (
                    <img
                      src={picture?.path}
                      alt="profile"
                      className="w-full h-full rounded-full"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-[2px]">
                  <div className="text-[14px]">Profile Picture</div>
                  <div className="flex gap-[8px]">
                    <button
                      className="h-[24px] w-[120px] bg-forth rounded-[4px] flex justify-center gap-[4px] items-center cursor-pointer"
                      type="button"
                    >
                      <div>
                        <UploadSvg />
                      </div>
                      <div
                        className="text-[12px] text-white"
                        onClick={openMedia}
                      >
                        Upload image
                      </div>
                    </button>
                    <button
                      className="h-[24px] w-[88px] rounded-[4px] border-2 border-customColor21 hover:text-red-600 flex justify-center items-center gap-[4px]"
                      type="button"
                    >
                      <div>
                        <RemoveSvg />
                      </div>
                      <div className="text-[12px] " onClick={remove}>
                        Remove
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Textarea label="Bio" name="bio" className="resize-none" />
            </div>
          </div>
          {!getRef && (
            <div className="justify-end flex">
              <Button type="submit" className="rounded-md">
                Save
              </Button>
            </div>
          )}
          {!!user?.tier?.team_members && isGeneral && <TeamsComponent />}
          {showLogout && <LogoutComponent />}
        </div>
      </form>
    </FormProvider>
  );
};

export const SettingsComponent = () => {
  const settings = useModals();
  const openModal = useCallback(() => {
    settings.openModal({
      children: <SettingsPopup />,
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      size: '100%',
    });
  }, []);

  return (
    <GearSvg className="cursor-pointer relative z-[200]" onClick={openModal} />
  );
};
