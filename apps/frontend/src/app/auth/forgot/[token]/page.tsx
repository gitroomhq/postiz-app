export const dynamic = 'force-dynamic';

import { ForgotReturn } from '@gitroom/frontend/components/auth/forgot-return';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gitroom Forgot Password',
  description: '',
};
export default async function Auth(params: { params: { token: string } }) {
  return <ForgotReturn token={params.params.token} />;
}
