import { ForgotReturn } from '@gitroom/frontend/components/auth/forgot-return';

export default async function Auth(params: { params: { token: string } }) {
  return <ForgotReturn token={params.params.token} />;
}
