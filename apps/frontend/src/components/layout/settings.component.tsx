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
import { PublicComponent } from '@gitroom/frontend/components/public-api/public.component';

export const SettingsPopup: FC<{ getRef?: Ref<any> }> = (props) => {
  const {isGeneral} = useVariables();
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
          {/*{!getRef && (*/}
          {/*  <button*/}
          {/*    onClick={close}*/}
          {/*    className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"*/}
          {/*    type="button"*/}
          {/*  >*/}
          {/*    <svg*/}
          {/*      viewBox="0 0 15 15"*/}
          {/*      fill="none"*/}
          {/*      xmlns="http://www.w3.org/2000/svg"*/}
          {/*      width="16"*/}
          {/*      height="16"*/}
          {/*    >*/}
          {/*      <path*/}
          {/*        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"*/}
          {/*        fill="currentColor"*/}
          {/*        fillRule="evenodd"*/}
          {/*        clipRule="evenodd"*/}
          {/*      ></path>*/}
          {/*    </svg>*/}
          {/*  </button>*/}
          {/*)}*/}
          {/*{!getRef && (*/}
          {/*  <div className="text-[24px] font-[600]">Profile Settings</div>*/}
          {/*)}*/}
          {/*<div className="flex flex-col gap-[4px]">*/}
          {/*  <div className="text-[20px] font-[500]">Profile</div>*/}
          {/*  <div className="text-[14px] text-customColor18 font-[400]">*/}
          {/*    Add profile information*/}
          {/*  </div>*/}
          {/*</div>*/}
          {/*<div className="rounded-[4px] border border-customColor6 p-[24px] flex flex-col">*/}
          {/*  <div className="flex justify-between items-center">*/}
          {/*    <div className="w-[455px]">*/}
          {/*      <Input label="Full Name" name="fullname" />*/}
          {/*    </div>*/}
          {/*    <div className="flex gap-[8px] mb-[10px]">*/}
          {/*      <div className="w-[48px] h-[48px] rounded-full bg-customColor38">*/}
          {/*        {!!picture?.path && (*/}
          {/*          <img*/}
          {/*            src={picture?.path}*/}
          {/*            alt="profile"*/}
          {/*            className="w-full h-full rounded-full"*/}
          {/*          />*/}
          {/*        )}*/}
          {/*      </div>*/}
          {/*      <div className="flex flex-col gap-[2px]">*/}
          {/*        <div className="text-[14px]">Profile Picture</div>*/}
          {/*        <div className="flex gap-[8px]">*/}
          {/*          <button*/}
          {/*            className="h-[24px] w-[120px] bg-forth rounded-[4px] flex justify-center gap-[4px] items-center cursor-pointer"*/}
          {/*            type="button"*/}
          {/*          >*/}
          {/*            <div>*/}
          {/*              <svg*/}
          {/*                xmlns="http://www.w3.org/2000/svg"*/}
          {/*                width="14"*/}
          {/*                height="14"*/}
          {/*                viewBox="0 0 14 14"*/}
          {/*                fill="none"*/}
          {/*              >*/}
          {/*                <path*/}
          {/*                  d="M12.25 8.3126V11.3751C12.25 11.6072 12.1578 11.8297 11.9937 11.9938C11.8296 12.1579 11.6071 12.2501 11.375 12.2501H2.625C2.39294 12.2501 2.17038 12.1579 2.00628 11.9938C1.84219 11.8297 1.75 11.6072 1.75 11.3751V8.3126C1.75 8.19657 1.79609 8.08529 1.87814 8.00324C1.96019 7.92119 2.07147 7.8751 2.1875 7.8751C2.30353 7.8751 2.41481 7.92119 2.49686 8.00324C2.57891 8.08529 2.625 8.19657 2.625 8.3126V11.3751H11.375V8.3126C11.375 8.19657 11.4211 8.08529 11.5031 8.00324C11.5852 7.92119 11.6965 7.8751 11.8125 7.8751C11.9285 7.8751 12.0398 7.92119 12.1219 8.00324C12.2039 8.08529 12.25 8.19657 12.25 8.3126ZM5.12203 4.68463L6.5625 3.24362V8.3126C6.5625 8.42863 6.60859 8.53991 6.69064 8.62196C6.77269 8.70401 6.88397 8.7501 7 8.7501C7.11603 8.7501 7.22731 8.70401 7.30936 8.62196C7.39141 8.53991 7.4375 8.42863 7.4375 8.3126V3.24362L8.87797 4.68463C8.96006 4.76672 9.0714 4.81284 9.1875 4.81284C9.3036 4.81284 9.41494 4.76672 9.49703 4.68463C9.57912 4.60254 9.62524 4.4912 9.62524 4.3751C9.62524 4.259 9.57912 4.14766 9.49703 4.06557L7.30953 1.87807C7.2689 1.83739 7.22065 1.80512 7.16754 1.78311C7.11442 1.76109 7.05749 1.74976 7 1.74976C6.94251 1.74976 6.88558 1.76109 6.83246 1.78311C6.77935 1.80512 6.7311 1.83739 6.69047 1.87807L4.50297 4.06557C4.42088 4.14766 4.37476 4.259 4.37476 4.3751C4.37476 4.4912 4.42088 4.60254 4.50297 4.68463C4.58506 4.76672 4.6964 4.81284 4.8125 4.81284C4.9286 4.81284 5.03994 4.76672 5.12203 4.68463Z"*/}
          {/*                  fill="white"*/}
          {/*                />*/}
          {/*              </svg>*/}
          {/*            </div>*/}
          {/*            <div className="text-[12px] text-white" onClick={openMedia}>*/}
          {/*              Upload image*/}
          {/*            </div>*/}
          {/*          </button>*/}
          {/*          <button*/}
          {/*            className="h-[24px] w-[88px] rounded-[4px] border-2 border-customColor21 hover:text-red-600 flex justify-center items-center gap-[4px]"*/}
          {/*            type="button"*/}
          {/*          >*/}
          {/*            <div>*/}
          {/*              <svg*/}
          {/*                xmlns="http://www.w3.org/2000/svg"*/}
          {/*                width="14"*/}
          {/*                height="14"*/}
          {/*                viewBox="0 0 14 14"*/}
          {/*                fill="none"*/}
          {/*              >*/}
          {/*                <path*/}
          {/*                  d="M11.8125 2.625H9.625V2.1875C9.625 1.8394 9.48672 1.50556 9.24058 1.25942C8.99444 1.01328 8.6606 0.875 8.3125 0.875H5.6875C5.3394 0.875 5.00556 1.01328 4.75942 1.25942C4.51328 1.50556 4.375 1.8394 4.375 2.1875V2.625H2.1875C2.07147 2.625 1.96019 2.67109 1.87814 2.75314C1.79609 2.83519 1.75 2.94647 1.75 3.0625C1.75 3.17853 1.79609 3.28981 1.87814 3.37186C1.96019 3.45391 2.07147 3.5 2.1875 3.5H2.625V11.375C2.625 11.6071 2.71719 11.8296 2.88128 11.9937C3.04538 12.1578 3.26794 12.25 3.5 12.25H10.5C10.7321 12.25 10.9546 12.1578 11.1187 11.9937C11.2828 11.8296 11.375 11.6071 11.375 11.375V3.5H11.8125C11.9285 3.5 12.0398 3.45391 12.1219 3.37186C12.2039 3.28981 12.25 3.17853 12.25 3.0625C12.25 2.94647 12.2039 2.83519 12.1219 2.75314C12.0398 2.67109 11.9285 2.625 11.8125 2.625ZM5.25 2.1875C5.25 2.07147 5.29609 1.96019 5.37814 1.87814C5.46019 1.79609 5.57147 1.75 5.6875 1.75H8.3125C8.42853 1.75 8.53981 1.79609 8.62186 1.87814C8.70391 1.96019 8.75 2.07147 8.75 2.1875V2.625H5.25V2.1875ZM10.5 11.375H3.5V3.5H10.5V11.375ZM6.125 5.6875V9.1875C6.125 9.30353 6.07891 9.41481 5.99686 9.49686C5.91481 9.57891 5.80353 9.625 5.6875 9.625C5.57147 9.625 5.46019 9.57891 5.37814 9.49686C5.29609 9.41481 5.25 9.30353 5.25 9.1875V5.6875C5.25 5.57147 5.29609 5.46019 5.37814 5.37814C5.46019 5.29609 5.57147 5.25 5.6875 5.25C5.80353 5.25 5.91481 5.29609 5.99686 5.37814C6.07891 5.46019 6.125 5.57147 6.125 5.6875ZM8.75 5.6875V9.1875C8.75 9.30353 8.70391 9.41481 8.62186 9.49686C8.53981 9.57891 8.42853 9.625 8.3125 9.625C8.19647 9.625 8.08519 9.57891 8.00314 9.49686C7.92109 9.41481 7.875 9.30353 7.875 9.1875V5.6875C7.875 5.57147 7.92109 5.46019 8.00314 5.37814C8.08519 5.29609 8.19647 5.25 8.3125 5.25C8.42853 5.25 8.53981 5.29609 8.62186 5.37814C8.70391 5.46019 8.75 5.57147 8.75 5.6875Z"*/}
          {/*                  fill="currentColor"*/}
          {/*                />*/}
          {/*              </svg>*/}
          {/*            </div>*/}
          {/*            <div className="text-[12px] " onClick={remove}>*/}
          {/*              Remove*/}
          {/*            </div>*/}
          {/*          </button>*/}
          {/*        </div>*/}
          {/*      </div>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*  <div>*/}
          {/*    <Textarea label="Bio" name="bio" className="resize-none" />*/}
          {/*  </div>*/}
          {/*</div>*/}
          {/*{!getRef && (*/}
          {/*  <div className="justify-end flex">*/}
          {/*    <Button type="submit" className='rounded-md'>Save</Button>*/}
          {/*  </div>*/}
          {/*)}*/}
          {!!user?.tier?.team_members && isGeneral && <TeamsComponent />}
          {!!user?.tier?.public_api && isGeneral && showLogout && <PublicComponent />}
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
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer relative z-[200]"
      onClick={openModal}
    >
      <path
        d="M19.9987 15.5C19.1087 15.5 18.2387 15.7639 17.4986 16.2584C16.7586 16.7528 16.1818 17.4556 15.8413 18.2779C15.5007 19.1002 15.4115 20.005 15.5852 20.8779C15.7588 21.7508 16.1874 22.5526 16.8167 23.182C17.4461 23.8113 18.2479 24.2399 19.1208 24.4135C19.9937 24.5871 20.8985 24.498 21.7208 24.1574C22.5431 23.8168 23.2459 23.2401 23.7403 22.5C24.2348 21.76 24.4987 20.89 24.4987 20C24.4975 18.8069 24.023 17.663 23.1793 16.8194C22.3357 15.9757 21.1918 15.5012 19.9987 15.5ZM19.9987 23C19.4054 23 18.8254 22.824 18.332 22.4944C17.8387 22.1647 17.4541 21.6962 17.2271 21.148C17 20.5999 16.9406 19.9967 17.0564 19.4147C17.1721 18.8328 17.4578 18.2982 17.8774 17.8787C18.297 17.4591 18.8315 17.1734 19.4134 17.0576C19.9954 16.9419 20.5986 17.0013 21.1468 17.2283C21.6949 17.4554 22.1635 17.8399 22.4931 18.3333C22.8228 18.8266 22.9987 19.4066 22.9987 20C22.9987 20.7956 22.6826 21.5587 22.12 22.1213C21.5574 22.6839 20.7944 23 19.9987 23ZM30.3056 18.0509C30.2847 17.9453 30.2413 17.8454 30.1784 17.7581C30.1155 17.6707 30.0345 17.5979 29.9409 17.5447L27.1443 15.9509L27.1331 12.799C27.1327 12.6905 27.1089 12.5833 27.063 12.4849C27.0172 12.3865 26.9506 12.2992 26.8678 12.229C25.8533 11.3709 24.6851 10.7134 23.4253 10.2912C23.3261 10.2577 23.2209 10.2452 23.1166 10.2547C23.0123 10.2643 22.9111 10.2955 22.8197 10.3465L19.9987 11.9234L17.175 10.3437C17.0834 10.2924 16.9821 10.2609 16.8776 10.2513C16.7732 10.2416 16.6678 10.2539 16.5684 10.2875C15.3095 10.7127 14.1426 11.3728 13.1297 12.2328C13.0469 12.3028 12.9804 12.39 12.9346 12.4882C12.8888 12.5865 12.8648 12.6935 12.8643 12.8019L12.8503 15.9565L10.0537 17.5503C9.96015 17.6036 9.87916 17.6763 9.81623 17.7637C9.7533 17.8511 9.70992 17.9509 9.68903 18.0565C9.43309 19.3427 9.43309 20.6667 9.68903 21.9528C9.70992 22.0584 9.7533 22.1583 9.81623 22.2456C9.87916 22.333 9.96015 22.4058 10.0537 22.459L12.8503 24.0528L12.8615 27.2047C12.8619 27.3132 12.8858 27.4204 12.9316 27.5188C12.9774 27.6172 13.044 27.7045 13.1268 27.7747C14.1413 28.6328 15.3095 29.2904 16.5693 29.7125C16.6686 29.7461 16.7737 29.7585 16.878 29.749C16.9823 29.7394 17.0835 29.7082 17.175 29.6572L19.9987 28.0765L22.8225 29.6562C22.9342 29.7185 23.0602 29.7508 23.1881 29.75C23.27 29.75 23.3514 29.7367 23.429 29.7106C24.6878 29.286 25.8547 28.6265 26.8678 27.7672C26.9505 27.6971 27.017 27.61 27.0628 27.5117C27.1087 27.4135 27.1326 27.3065 27.1331 27.1981L27.1472 24.0434L29.9437 22.4497C30.0373 22.3964 30.1183 22.3236 30.1812 22.2363C30.2441 22.1489 30.2875 22.049 30.3084 21.9434C30.5629 20.6583 30.562 19.3357 30.3056 18.0509ZM28.8993 21.3237L26.2209 22.8472C26.1035 22.9139 26.0064 23.0111 25.9397 23.1284C25.8853 23.2222 25.8281 23.3215 25.77 23.4153C25.6956 23.5335 25.6559 23.6703 25.6556 23.81L25.6415 26.8334C24.9216 27.3988 24.1195 27.8509 23.2631 28.174L20.5612 26.6684C20.449 26.6064 20.3228 26.5741 20.1947 26.5747H20.1768C20.0634 26.5747 19.949 26.5747 19.8356 26.5747C19.7014 26.5713 19.5688 26.6037 19.4512 26.6684L16.7475 28.1778C15.8892 27.8571 15.0849 27.4072 14.3625 26.8437L14.3522 23.825C14.3517 23.685 14.3121 23.548 14.2378 23.4294C14.1797 23.3356 14.1225 23.2419 14.069 23.1425C14.0028 23.0233 13.9056 22.9242 13.7878 22.8556L11.1065 21.3284C10.9678 20.4507 10.9678 19.5567 11.1065 18.679L13.7803 17.1528C13.8976 17.0861 13.9948 16.9889 14.0615 16.8715C14.1159 16.7778 14.1731 16.6784 14.2312 16.5847C14.3056 16.4664 14.3453 16.3297 14.3456 16.19L14.3597 13.1665C15.0796 12.6012 15.8816 12.1491 16.7381 11.8259L19.4362 13.3315C19.5536 13.3966 19.6864 13.429 19.8206 13.4253C19.934 13.4253 20.0484 13.4253 20.1618 13.4253C20.296 13.4286 20.4287 13.3963 20.5462 13.3315L23.25 11.8222C24.1082 12.1429 24.9125 12.5927 25.635 13.1562L25.6453 16.175C25.6457 16.3149 25.6854 16.452 25.7597 16.5706C25.8178 16.6644 25.875 16.7581 25.9284 16.8575C25.9947 16.9767 26.0918 17.0758 26.2097 17.1444L28.8909 18.6715C29.0315 19.5499 29.0331 20.4449 28.8956 21.3237H28.8993Z"
        fill="currentColor"
      />
    </svg>
  );
};
