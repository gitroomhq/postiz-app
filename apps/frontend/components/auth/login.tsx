import Link from 'next/link';
import { AuthValidator } from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Logo from '../common/Logo';

type FormValues = {
  email: string;
  password: string;
};

const resolver: Resolver<FormValues> = classValidatorResolver(AuthValidator);

function Login() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const methods = useForm<FormValues>({
    mode: 'all',
    resolver,
  });

  const registerSubmit = methods.handleSubmit(
    async (values: { email: string; password: string }) => {
      try {
        await axiosInstance.post('/auth/login', values);
        return router.push('/');
      } catch (err) {
        setErr('Wrong email or password');
      }
    }
  );

  return (
    <div className={`flex w-full h-screen justify-center`}>
      <div className="w-1/2 bg-gradient-black">
        <div className="flex-col flex justify-center items-center h-full">
          <Logo responsive={false} />
          <div className="flex mt-8">
            <FormProvider {...methods}>
              <form
                className="p-8 border border-[#ffffff]/20 bg-gradient-purple rounded shadow w-[500px] max-w-[100%]"
                onSubmit={registerSubmit}
              >
                <h2 className="text-2xl font-bold mb-6 bg-words-purple bg-clip-text text-transparent">
                  Login
                </h2>
                <div className="mb-2">
                  <Input
                    label="Email"
                    type="text"
                    id="email"
                    name="email"
                    className="text-white"
                    labelClassName="bg-words-purple bg-clip-text text-transparent"
                  />
                </div>
                <div>
                  <Input
                    label="Password"
                    type="password"
                    id="password"
                    name="password"
                    className="text-white"
                    labelClassName="bg-words-purple bg-clip-text text-transparent"
                  />
                </div>
                <div className="mt-3 mb-3 text-red-500">{err}</div>
                <div className="w-full flex justify-center">
                  <button
                    type="submit"
                    className="py-4 px-12 font-semibold rounded-md shadow bg-button-purple text-white w-56 backdrop-blur-lg"
                  >
                    Login
                  </button>
                </div>
              </form>
            </FormProvider>
          </div>
          <div className="text-left mt-4">
            <Link
              href="/auth/register"
              className="bg-words-purple bg-clip-text text-transparent border-b border-words-purple"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
