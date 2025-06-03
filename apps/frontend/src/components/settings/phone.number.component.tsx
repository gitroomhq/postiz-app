import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import React, { useCallback, useMemo, useState } from 'react';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useModals } from '@mantine/modals';
import { TopTitle } from '@gitroom/frontend/components/launches/helpers/top.title.component';
import { PhoneInput } from '@gitroom/react/form/phone.input';
import { CodeInput } from '@gitroom/react/form/code.input';
import { useForm, FormProvider } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { VerifyPhoneNumberDto } from '@gitroom/nestjs-libraries/dtos/settings/verify.phone.number.dto';
import { useToaster } from '@gitroom/react/toaster/toaster';
import interClass from '@gitroom/react/helpers/inter.font';
import clsx from 'clsx';
import { parsePhoneNumberWithError } from 'libphonenumber-js'
import { Tooltip } from 'react-tooltip';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { setCookie } from '@gitroom/frontend/components/layout/layout.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';


export const AddPhoneNumber = ({ userId }: { userId?: string }) => {
  const { isSecured } = useVariables();
  const modals = useModals();
  const user = useUser();
  const fetch = useFetch();
  const toast = useToaster();
  const t = useT();
  const [codeStatus, setCodeStatus] = useState<'sent' | 'sending' | null>(null)
  const [verifying, setVerifying] = useState(false)

  const phoneInputDisabled = codeStatus === 'sent' || codeStatus === 'sending'

  const resolver = useMemo(() => {
    return classValidatorResolver(VerifyPhoneNumberDto);
  }, []);

  const form = useForm({
    values: {
      phoneNumber: '',
      code: '',
    },
    resolver,
    mode: 'onChange',
  });

  const logout = useCallback(async () => {
    if (!isSecured) {
      setCookie('auth', '', -10);
    } else {
      await fetch('/user/logout', {
        method: 'POST',
      });
    }

    window.location.href = '/';
  }, []);

  const submit = useCallback(
    async (values: { phoneNumber: string, code: string }) => {
      const basePath = userId ? '/phone-number/change' : '/phone-number';

      if (codeStatus === 'sent' && (!values.code || values.code?.length !== 6)) {
        toast.show('The Verification Code is required', "warning");
        return
      } else if (codeStatus === 'sent' && values.code) {
        setVerifying(true)

        const response = await (
          await fetch(`${basePath}/verify-code`, {
            method: 'POST',
            body: JSON.stringify({
              phoneNumber: values.phoneNumber.substring(1),
              code: values.code,
            }),
          })
        ).json();

        if (response.verified) {
          toast.show("Phone number verified!");
          user?.updateUser({ phoneNumber: values.phoneNumber, phoneNumberVerified: true })
          modals.closeAll()

          const timmer = setTimeout(async () => {
            await logout()
            clearTimeout(timmer)
          }, 60000)
          return;
        }

        toast.show(response.message, 'warning');
        setVerifying(false)
        return;
      }

      setCodeStatus('sending')

      const response = await (
        await fetch(`${basePath}/send-code`, {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: values.phoneNumber.substring(1),
          }),
        })
      ).json();

      if (response.message) {
        setCodeStatus(null)
        toast.show(response.message, "warning");
        return
      }

      toast.show("We've sent a code to your phone number.");
      user?.updateUser({ phoneNumber: values.phoneNumber, phoneNumberVerified: false })
      setCodeStatus('sent')
    },
    [codeStatus]
  );

  const closeModal = useCallback(async () => {
    if (await deleteDialog('Do you want to close it?', 'Yes')) {
      return modals.closeAll();
    }
  }, []);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)}>
        <div className="relative flex gap-[10px] flex-col flex-1 rounded-[4px] border border-customColor6 bg-sixth p-[16px] pt-0">
          <TopTitle title={userId ? t('change_phone_number', 'Change Phone number') : t('verify_phone_number', 'Verify Phone number')} />
          <button
            onClick={closeModal}
            className="outline-none absolute right-[20px] top-[20px] mantine-UnstyledButton-root mantine-ActionIcon-root hover:bg-tableBorder cursor-pointer mantine-Modal-close mantine-1dcetaa"
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

          <PhoneInput
            className={clsx(phoneInputDisabled && 'pointer-events-none opacity-30')}
            required={!phoneInputDisabled}
            label={t('phone_number', 'Phone number')}
            placeholder={t('phone_number', 'Phone number')}
            name="phoneNumber"
          />

          {codeStatus === 'sent' && (
            <CodeInput name='code' label={t('code', 'Code')} />
          )}

          <Button disabled={codeStatus === 'sending' || verifying} type="submit" className="mt-[18px]">
            {codeStatus === 'sent' ? t('verify_phone_number', 'Verify Phone Number') : t('send_verification_code', 'Send Verification Code')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const PhoneNumberComponent = () => {
  const user = useUser();
  const modals = useModals();
  const t = useT();

  const addPhoneNumber = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      children: <AddPhoneNumber />,
    });
  }, []);

  const changePhoneNumber = useCallback(() => {
    modals.openModal({
      classNames: {
        modal: 'bg-transparent text-textColor',
      },
      withCloseButton: false,
      children: <AddPhoneNumber userId={user?.id} />,
    });
  }, [user?.id]);

  const parsePhone = (phone: string) => {
    try {
      return parsePhoneNumberWithError(`+${phone}`).formatInternational()
    } catch (error) {
      return phone
    }
  }

  const data = user?.phoneNumber && [{ phoneNumber: user?.phoneNumber, phoneNumberVerified: user?.phoneNumberVerified }]

  return (
    <div className="flex flex-col">
      <h3 className="text-[20px]">{t('whatsapp_integration_title', 'WhatsApp AI Integration')}</h3>
      <div className="text-customColor18 mt-[4px]">
        {t('whatsapp_integration_description', 'Connect your WhatsApp number to interact directly with our AI-powered assistant. Automate tasks, get updates, and manage content from your phone.')}
      </div>
      <div className="my-[16px] mt-[16px] bg-sixth border-fifth border rounded-[4px] p-[24px] flex flex-col gap-[24px]">
        <div className="flex flex-col gap-[16px]">
          {data && data.map((p) => (
            <div key={p.phoneNumber} className="flex items-center">
              <div className='flex-1'>
                {user?.phoneNumberVerified ? (
                  <>
                    <a
                      data-tooltip-id="go-whatsapp-tooltip"
                      data-tooltip-content="Go to chat with WhatsApp AI agent"
                      href='https://wa.me/18294662320?text=Hola, quiero publicar!'
                      target='_blank'
                      className="border-b border-blue-500 text-blue-500 font-bold"
                    >
                      {p.phoneNumber ? parsePhone(p.phoneNumber) : ''}
                    </a>
                    <Tooltip id='go-whatsapp-tooltip' />
                  </>) : (
                  <p>{p.phoneNumber ? parsePhone(p.phoneNumber) : ''}</p>
                )}
              </div>
              <div className={clsx(p.phoneNumberVerified ? 'bg-green-500' : 'bg-red-500', 'px-4')}>
                {p.phoneNumberVerified ? t('verified', 'Verified') : t('unverified', 'Unverified')}
              </div>
              <div className="flex-1 flex justify-end">
                <Button
                  className={`!bg-customColor3 !h-[24px] border border-customColor21 rounded-[4px] text-[12px] ${interClass}`}
                  onClick={changePhoneNumber}
                  secondary={true}
                >
                  <div className="flex justify-center items-center gap-[4px]">
                    <div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M4 20H20M14.828 4.828C15.5784 4.07762 16.4216 4.07762 17.172 4.828L19.172 6.828C19.9224 7.57843 19.9224 8.42157 19.172 9.172L9 19.344L4 20L4.656 15L14.828 4.828Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>{t('change', 'Change')}</div>
                  </div>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div>
          {!user?.phoneNumber && (
            <Button onClick={addPhoneNumber}>
              {t('add_phone_number', 'Add Phone Number')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
