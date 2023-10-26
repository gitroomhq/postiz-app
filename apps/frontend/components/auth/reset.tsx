import Link from 'next/link';
import ResetRequest from '@clickvote/frontend/components/auth/reset/request';
import ResetConfirmation from '@clickvote/frontend/components/auth/reset/confirm';
import Logo from '../common/Logo';

function Reset({ token }: { token: string }) {
  return (
    <div className={`flex w-full h-screen justify-center`}>
      <div className="w-1/2 bg-gradient-black">
        <div className="flex-col flex justify-center items-center h-full">
          <Logo responsive={false} />
          <div className="flex mt-8">
            {!token ? <ResetRequest /> : <ResetConfirmation token={token} />}
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
