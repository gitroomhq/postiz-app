export const dynamic = 'force-dynamic';

import {Login} from "@gitroom/frontend/components/auth/login";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Login',
  description: '',
};

export default async function Auth() {
    return (
        <Login />
    );
}
