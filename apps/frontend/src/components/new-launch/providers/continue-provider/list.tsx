'use client';

import { InstagramContinue } from '@chaolaolo/frontend/components/new-launch/providers/continue-provider/instagram/instagram.continue';
import { FacebookContinue } from '@chaolaolo/frontend/components/new-launch/providers/continue-provider/facebook/facebook.continue';
import { LinkedinContinue } from '@chaolaolo/frontend/components/new-launch/providers/continue-provider/linkedin/linkedin.continue';
export const continueProviderList = {
  instagram: InstagramContinue,
  facebook: FacebookContinue,
  'linkedin-page': LinkedinContinue,
};
