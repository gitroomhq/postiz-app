import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import {Forgot} from "@gitroom/frontend/components/auth/forgot";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Forgot Password`,
  description: '',
};

export default async function Auth() {
    return (
        <Forgot />
    );
}
