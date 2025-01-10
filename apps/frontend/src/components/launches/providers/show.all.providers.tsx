import {FC} from "react";
import {Integrations} from "@gitroom/frontend/components/launches/calendar.context";
import DevtoProvider from "@gitroom/frontend/components/launches/providers/devto/devto.provider";
import XProvider from "@gitroom/frontend/components/launches/providers/x/x.provider";
import LinkedinProvider from "@gitroom/frontend/components/launches/providers/linkedin/linkedin.provider";
import RedditProvider from "@gitroom/frontend/components/launches/providers/reddit/reddit.provider";
import MediumProvider from "@gitroom/frontend/components/launches/providers/medium/medium.provider";
import HashnodeProvider from "@gitroom/frontend/components/launches/providers/hashnode/hashnode.provider";
import FacebookProvider from '@gitroom/frontend/components/launches/providers/facebook/facebook.provider';
import InstagramProvider from '@gitroom/frontend/components/launches/providers/instagram/instagram.collaborators';
import YoutubeProvider from '@gitroom/frontend/components/launches/providers/youtube/youtube.provider';
import TiktokProvider from '@gitroom/frontend/components/launches/providers/tiktok/tiktok.provider';
import PinterestProvider from '@gitroom/frontend/components/launches/providers/pinterest/pinterest.provider';
import DribbbleProvider from '@gitroom/frontend/components/launches/providers/dribbble/dribbble.provider';
import ThreadsProvider from '@gitroom/frontend/components/launches/providers/threads/threads.provider';
import DiscordProvider from '@gitroom/frontend/components/launches/providers/discord/discord.provider';
import SlackProvider from '@gitroom/frontend/components/launches/providers/slack/slack.provider';
import MastodonProvider from '@gitroom/frontend/components/launches/providers/mastodon/mastodon.provider';
import BlueskyProvider from '@gitroom/frontend/components/launches/providers/bluesky/bluesky.provider';
import LemmyProvider from '@gitroom/frontend/components/launches/providers/lemmy/lemmy.provider';

export const Providers = [
    {identifier: 'devto', component: DevtoProvider},
    {identifier: 'x', component: XProvider},
    {identifier: 'linkedin', component: LinkedinProvider},
    {identifier: 'linkedin-page', component: LinkedinProvider},
    {identifier: 'reddit', component: RedditProvider},
    {identifier: 'medium', component: MediumProvider},
    {identifier: 'hashnode', component: HashnodeProvider},
    {identifier: 'facebook', component: FacebookProvider},
    {identifier: 'instagram', component: InstagramProvider},
    {identifier: 'instagram-standalone', component: InstagramProvider},
    {identifier: 'youtube', component: YoutubeProvider},
    {identifier: 'tiktok', component: TiktokProvider},
    {identifier: 'pinterest', component: PinterestProvider},
    {identifier: 'dribbble', component: DribbbleProvider},
    {identifier: 'threads', component: ThreadsProvider},
    {identifier: 'discord', component: DiscordProvider},
    {identifier: 'slack', component: SlackProvider},
    {identifier: 'mastodon', component: MastodonProvider},
    {identifier: 'bluesky', component: BlueskyProvider},
    {identifier: 'lemmy', component: LemmyProvider},
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