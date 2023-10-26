import Link from 'next/link';
import { ResetConfirmValidator } from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useState } from 'react';

type FormValues = {
  password: string;
  password_confirm: string;
};

const resolver: Resolver<FormValues> = classValidatorResolver(
  ResetConfirmValidator
);

function ResetConfirmation({ token }: { token: string }) {
  const [err, setErr] = useState('');
  const [isDisabled, setDisabledButton] = useState(false);
  const [isPasswordReset, setPasswordReset] = useState(false);
  const methods = useForm<FormValues>({
    mode: 'all',
    resolver,
  });

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
          await axiosInstance.post('/auth/reset/confirm', data);
          // Password reset was successful
          setErr('');
          setPasswordReset(true);
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
    <FormProvider {...methods}>
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
                autoComplete="new-password"
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
                autoComplete="new-password"
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
    </FormProvider>
  );
}

export default ResetConfirmation;
