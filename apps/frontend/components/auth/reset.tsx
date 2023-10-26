import Link from 'next/link';
import {
  ResetConfirmValidator,
  ResetRequestValidator,
} from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useState } from 'react';
import Logo from '../common/Logo';

type FormValues = {
  password: string;
  password_confirm: string;
  email: string;
};

const requestResolver: Resolver<FormValues> = classValidatorResolver(
  ResetRequestValidator
);
const confirmationResolver: Resolver<FormValues> = classValidatorResolver(
  ResetConfirmValidator
);

function Reset({ token }: { token: string }) {
  const [err, setErr] = useState('');
  const [isDisabled, setDisabledButton] = useState(false);
  const [isRequestSent, setRequestSent] = useState(false);
  const [isPasswordReset, setPasswordReset] = useState(false);
  const methods = useForm<FormValues>({
    mode: 'all',
    resolver: token ? confirmationResolver : requestResolver,
  });

  const ResetRequestComponent = () => {
    // Verify existence of user before sending a mail with reset link
    return (
      <form
        className="p-8 border border-[#ffffff]/20 bg-gradient-purple rounded shadow w-[500px] max-w-[100%]"
        onSubmit={ResetRequest}
      >
        <h2 className="text-2xl font-bold mb-6 bg-words-purple bg-clip-text text-transparent">
          Reset password
        </h2>
        {isRequestSent ? (
          <p className="text-center">
            A password reset link was sent to your email
            <br />
            Please check your inbox
          </p>
        ) : (
          <div>
            <div className="mb-2">
              <Input
                label="Registered Email"
                type="text"
                id="email"
                name="email"
                className="text-white"
                labelClassName="bg-words-purple bg-clip-text text-transparent"
              />
            </div>
            <div className="text-center mb-3 text-red-500">{err}</div>
            <div className="w-full flex justify-center">
              <button
                type="submit"
                disabled={isDisabled}
                className="mt-3 py-4 px-12 font-semibold rounded-md shadow bg-button-purple text-white w-56 backdrop-blur-lg hover:opacity-70"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </form>
    );
  };

  const ResetRequest = methods.handleSubmit(
    async (values: { email: string }) => {
      try {
        setDisabledButton(true);
        setErr('');
        await axiosInstance.post('/auth/reset/request', values);
        setRequestSent(true);
      } catch (err) {
        setErr('User not found');
      } finally {
        setDisabledButton(false);
      }
    }
  );

  const ResetConfirmationComponent = () => {
    // After security verification, this component allows to set new password
    return (
      <form
        className="p-8 border border-[#ffffff]/20 bg-gradient-purple rounded shadow w-[500px] max-w-[100%]"
        onSubmit={ResetConfirmation}
      >
        <h2 className="text-2xl font-bold mb-6 bg-words-purple bg-clip-text text-transparent">
          Reset password
        </h2>
        {isPasswordReset ? (
          <div className="text-center">
            Password reset successful ✔
            <br />
            You can now{' '}
            <Link
              href="/auth/login"
              className="bg-words-purple bg-clip-text text-transparent border-b border-words-purple"
            >
              login
            </Link>{' '}
            with new credentials
          </div>
        ) : (
          <div>
            <div>
              <Input
                label="New Password"
                type="password"
                id="password"
                name="password"
                className="text-white"
                labelClassName="bg-words-purple bg-clip-text text-transparent"
              />
            </div>
            <div>
              <Input
                label="Confirm Password"
                type="password"
                id="password_confirm"
                name="password_confirm"
                className="text-white"
                labelClassName="bg-words-purple bg-clip-text text-transparent"
              />
            </div>
            <div className="text-center mb-3 text-red-500">{err}</div>
            <div className="w-full flex justify-center">
              <button
                type="submit"
                disabled={isDisabled}
                className="mt-3 py-4 px-12 font-semibold rounded-md shadow bg-button-purple text-white w-56 backdrop-blur-lg hover:opacity-70"
              >
                Set Password
              </button>
            </div>
          </div>
        )}
      </form>
    );
  };

  const ResetConfirmation = methods.handleSubmit(
    async (values: { password: string; password_confirm: string }) => {
      try {
        setDisabledButton(true);
        if (values.password !== values.password_confirm) {
          setErr('Passwords do not match');
        } else {
          const data = {
            token: token,
            password: values.password,
          };
          const response = await axiosInstance.post(
            '/auth/reset/confirm',
            data
          );
          if (response.status === 204) {
            // Password reset was successful
            setErr('');
            setPasswordReset(true);
          }
        }
      } catch (err) {
        setErr('Invalid/Expired token! Password reset failed');
      } finally {
        setDisabledButton(false);
      }
    },
    (errors) => console.error(errors)
  );

  return (
    <div className={`flex w-full h-screen justify-center`}>
      <div className="w-1/2 bg-gradient-black">
        <div className="flex-col flex justify-center items-center h-full">
          <Logo responsive={false} />
          <div className="flex mt-8">
            <FormProvider {...methods}>
              {!token ? (
                <ResetRequestComponent />
              ) : (
                <ResetConfirmationComponent />
              )}
            </FormProvider>
          </div>
          <div className="text-left mt-4 flex gap-36">
            <span>
              <Link
                href="/auth/login"
                className="bg-words-purple bg-clip-text text-transparent border-b border-words-purple"
              >
                Login
              </Link>
            </span>
            <span>
              <Link
                href="/auth/register"
                className="bg-words-purple bg-clip-text text-transparent border-b border-words-purple"
              >
                Register
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reset;
