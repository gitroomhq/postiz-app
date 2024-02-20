import {FC} from "react";
import {Integrations} from "@gitroom/frontend/components/launches/calendar.context";
import DevtoProvider from "@gitroom/frontend/components/launches/providers/devto/devto.provider";
import XProvider from "@gitroom/frontend/components/launches/providers/x/x.provider";
import LinkedinProvider from "@gitroom/frontend/components/launches/providers/linkedin/linkedin.provider";
import RedditProvider from "@gitroom/frontend/components/launches/providers/reddit/reddit.provider";

const Providers = [
    {identifier: 'devto', component: DevtoProvider},
    {identifier: 'x', component: XProvider},
    {identifier: 'linkedin', component: LinkedinProvider},
    {identifier: 'reddit', component: RedditProvider},
];

export const ShowAllProviders: FC<{integrations: Integrations[], value: Array<{content: string, id?: string}>, selectedProvider?: Integrations}> = (props) => {
    const {integrations, value, selectedProvider} = props;
    return (
        <>
            {integrations.map((integration) => {
                const {component: ProviderComponent} = Providers.find(provider => provider.identifier === integration.identifier) || {component: null};
                if (!ProviderComponent || integrations.map(p => p.id).indexOf(selectedProvider?.id!) === -1) {
                    return null;
                }
                return <ProviderComponent key={integration.id} {...integration} value={value} show={selectedProvider?.id === integration.id} />;
            })}
        </>
    )
}