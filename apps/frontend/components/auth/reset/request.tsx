import { ResetRequestValidator } from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useState } from 'react';

type FormValues = {
  email: string;
};

const resolver: Resolver<FormValues> = classValidatorResolver(
  ResetRequestValidator
);

function ResetRequest() {
  const [err, setErr] = useState('');
  const [isDisabled, setDisabledButton] = useState(false);
  const [isRequestSent, setRequestSent] = useState(false);
  const methods = useForm<FormValues>({
    mode: 'all',
    resolver,
  });

  const ResetRequestSubmit = methods.handleSubmit(
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

  return (
    <FormProvider {...methods}>
      <form
        className="p-8 border border-[#ffffff]/20 bg-gradient-purple rounded shadow w-[500px] max-w-[100%]"
        onSubmit={ResetRequestSubmit}
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
    </FormProvider>
  );
}

export default ResetRequest;
