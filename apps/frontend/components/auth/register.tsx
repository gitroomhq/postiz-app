import Link from 'next/link';
import { AuthValidator } from '@clickvote/validations';
import { axiosInstance } from '@clickvote/frontend/helper/axios';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { useForm, Resolver, FormProvider } from 'react-hook-form';
import { Input } from '@clickvote/frontend/components/form/input';
import { useRouter } from 'next/router';
import { useState } from 'react';

type FormValues = {
  email: string;
  password: string;
};

const resolver: Resolver<FormValues> = classValidatorResolver(AuthValidator);

function Register() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const methods = useForm<FormValues>({
    mode: 'all',
    resolver,
  });

  const registerSubmit = methods.handleSubmit(
    async (values: { email: string; password: string }) => {
      try {
        await axiosInstance.post('/auth/register', values);
        return router.push('/');
      } catch (err) {
        setErr('Email already exists');
      }
    }
  );

  return (
    <div className="flex h-screen">
      <div className="w-1/2 bg-black">
        {/* Left side (image) */}
        <div className="flex justify-center items-center h-full">
          <img
            src="https://img.freepik.com/free-photo/view-3d-boy-spacesuit_23-2150710070.jpg"
            alt="Nice Picture"
            className="w-3/4 rounded shadow-lg"
          />
        </div>
      </div>
      <div className="w-1/2 bg-[#212226] flex justify-center items-center">
        <FormProvider {...methods}>
          <form
            className="p-8 border border-[#ffffff]/20 bg-black rounded shadow w-[350px] max-w-[100%]"
            onSubmit={registerSubmit}
          >
            <h2 className="text-3xl font-bold text-white mb-6">Register</h2>
            <div className="mb-4">
              <Input
                label="Email"
                type="text"
                id="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#BADC58] placeholder-gray-500"
                placeholder="Enter your email"
              />
            </div>
            <div className="mb-6">
              <Input
                label="Password"
                type="password"
                id="password"
                name="password"
                placeholder="Create a password"
              />
            </div>
            <div className="mb-4 text-red-500">{err}</div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-br from-[#BADC58] to-[#F1C40F] text-black font-semibold rounded hover:bg-[#F1C40F]"
            >
              Sign Up
            </button>
          </form>
        </FormProvider>
        <div className="text-white mt-4">
          Already have an account?{' '}
          <Link href="/auth/login">
            <a className="text-[#BADC58] hover:underline font-semibold">
              Login
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
