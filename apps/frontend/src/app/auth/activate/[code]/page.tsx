import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { AfterActivate } from '@gitroom/frontend/components/auth/after.activate';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} - Activate your account`,
  description: '',
};

export default async function Auth() {
  return <AfterActivate />;
}
