import 'reflect-metadata';
import { FC } from 'react';
import { Post as PrismaPost } from '.prisma/client';
import { Providers } from '@gitroom/frontend/components/launches/providers/show.all.providers';

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

  return (
    <ProviderComponent
      hideMenu={true}
      show={true}
      identifier={props.post.integration}
      // @ts-ignore
      value={props.post.posts.map((p) => ({
        id: p.id,
        content: p.content,
        image: p.image,
      }))}
    />
  );
};
