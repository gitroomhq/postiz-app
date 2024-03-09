import {Forgot} from "@gitroom/frontend/components/auth/forgot";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Forgot Password',
  description: '',
};

export default async function Auth() {
    return (
        <Forgot />
    );
}
