import Link from 'next/link';
import { AuthValidator } from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useRouter } from 'next/router';
import {useState} from "react";

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
      }
      catch (err) {
        setErr('Wrong email or password');
      }
    }
  );

  return (
    <div className="flex h-screen flex-row-reverse">
      <div className="w-1/2 bg-black">
        {/* Right side (image) */}
        <div className="flex justify-center items-center h-full">
          <img
            src="your-image-url.jpg"
            alt="Nice Picture"
            className="w-3/4 rounded shadow-lg"
          />
        </div>
      </div>
      <div className="w-1/2 bg-[#212226]">
        <div className="flex-col flex justify-center items-center h-full">
          <div className="flex">
            <FormProvider {...methods}>
              <form
                className="p-8 border border-[#ffffff]/20 bg-black rounded shadow w-[500px] max-w-[100%]"
                onSubmit={registerSubmit}
              >
                <h2 className="text-2xl font-bold mb-6">Login</h2>
                <div className="mb-2">
                  <Input
                    label="Email"
                    type="text"
                    id="email"
                    name="email"
                    className="text-black"
                  />
                </div>
                <div>
                  <Input
                    label="password"
                    type="password"
                    id="password"
                    name="password"
                  />
                </div>
                <div className="mt-3 mb-3 text-red-500">
                  {err}
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 font-semibold rounded shadow bg-gradient-to-br from-[#BADC58] to-[#F1C40F] text-black"
                >
                  Sign In
                </button>
              </form>
            </FormProvider>
          </div>
          <div className="text-left mt-2">
            <Link href="/auth/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
