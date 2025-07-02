import 'reflect-metadata';
import { FC } from 'react';
import { Post as PrismaPost } from '.prisma/client';
import { Providers } from '@gitroom/frontend/components/new-launch/providers/show.all.providers';
export const PreviewPopupDynamic: FC<{
  postId: string;
  providerId: string;
  post: {
    integration: string;
    group: string;
    posts: PrismaPost[];
    settings: any;
  };
}> = (props) => {
  const { component: ProviderComponent } = Providers.find(
    (p) => p.identifier === props.providerId
  )!;
  return null;
};
