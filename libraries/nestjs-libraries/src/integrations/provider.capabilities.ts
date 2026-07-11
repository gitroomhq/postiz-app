import { Integration } from '@prisma/client';
import {
  ClientInformation,
  GenerateAuthUrlResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

export type ProviderAuthOption = {
  id: string;
  title: string;
  description: string;
  capabilities: string[];
  recommended?: boolean;
};

export interface SelectableAuthProvider {
  authOptions: ProviderAuthOption[];
  getAuthMode?(integration: Integration): string;
  generateAuthUrlForMode(
    authMode: string,
    clientInformation?: ClientInformation
  ): Promise<GenerateAuthUrlResponse>;
}

export type CapableSocialProvider = SocialProvider &
  Partial<SelectableAuthProvider>;

export const supportsSelectableAuth = (
  provider: CapableSocialProvider
): provider is CapableSocialProvider & SelectableAuthProvider =>
  Array.isArray(provider.authOptions) &&
  typeof provider.generateAuthUrlForMode === 'function';
