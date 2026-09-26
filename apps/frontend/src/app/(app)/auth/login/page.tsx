export const dynamic = 'force-dynamic';
import { Login } from '@gitroom/frontend/components/auth/login';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `Postmonster Login`,
  description: '',
};
export default async function Auth() {
  // postmonster: closed access (PRD 6) - swaps the Sign Up link for Request access
  return (
    <Login registrationDisabled={process.env.DISABLE_REGISTRATION === 'true'} />
  );
}
