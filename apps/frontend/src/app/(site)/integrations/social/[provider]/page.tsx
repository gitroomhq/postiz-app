export const dynamic = 'force-dynamic';

import {internalFetch} from "@gitroom/helpers/utils/internal.fetch";
import {redirect} from "next/navigation";

export default async function Page({params: {provider}, searchParams}: {params: {provider: string}, searchParams: any}) {
    if (provider === 'x') {
        searchParams = {
            ...searchParams,
            state: searchParams.oauth_token || '',
            code: searchParams.oauth_verifier || ''
        };
    }

    await internalFetch(`/integrations/social/${provider}/connect`, {
        method: 'POST',
        body: JSON.stringify(searchParams)
    });

    return redirect(`/launches?added=${provider}`);
}