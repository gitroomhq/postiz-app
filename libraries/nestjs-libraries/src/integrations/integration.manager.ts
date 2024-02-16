import {Injectable} from "@nestjs/common";
import {XProvider} from "@gitroom/nestjs-libraries/integrations/social/x.provider";
import {SocialProvider} from "@gitroom/nestjs-libraries/integrations/social/social.integrations.interface";
import {LinkedinProvider} from "@gitroom/nestjs-libraries/integrations/social/linkedin.provider";
import {RedditProvider} from "@gitroom/nestjs-libraries/integrations/social/reddit.provider";
import {DevToProvider} from "@gitroom/nestjs-libraries/integrations/article/dev.to.provider";
import {HashnodeProvider} from "@gitroom/nestjs-libraries/integrations/article/hashnode.provider";
import {MediumProvider} from "@gitroom/nestjs-libraries/integrations/article/medium.provider";
import {ArticleProvider} from "@gitroom/nestjs-libraries/integrations/article/article.integrations.interface";

const socialIntegrationList = [
    new XProvider(),
    new LinkedinProvider(),
    new RedditProvider()
];

const articleIntegrationList = [
    new DevToProvider(),
    new HashnodeProvider(),
    new MediumProvider()
];

@Injectable()
export class IntegrationManager {
    getAllIntegrations() {
        return {
            social: socialIntegrationList.map(p => ({name: p.name, identifier: p.identifier})),
            article: articleIntegrationList.map(p => ({name: p.name, identifier: p.identifier})),
        };
    }
    getAllowedSocialsIntegrations() {
        return socialIntegrationList.map(p => p.identifier);
    }
    getSocialIntegration(integration: string): SocialProvider {
        return socialIntegrationList.find(i => i.identifier === integration)!;
    }
    getAllowedArticlesIntegrations() {
        return articleIntegrationList.map(p => p.identifier);
    }
    getArticlesIntegration(integration: string): ArticleProvider {
        return articleIntegrationList.find(i => i.identifier === integration)!;
    }
}