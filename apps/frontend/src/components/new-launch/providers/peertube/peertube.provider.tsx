'use client';

import {
  withProvider,
  PostComment,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { PeertubePreview } from '@gitroom/frontend/components/new-launch/providers/peertube/peertube.preview';
import { PeerTubeDto } from "@gitroom/nestjs-libraries/dtos/posts/providers-settings/peertube.dto";
import { PeertubeSettings } from '@gitroom/frontend/components/new-launch/providers/peertube/peertube.settings';

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [
    {
      format: 'with-pictures',
      type: 'post',
      maximumCharacters: 10000,
    },
  ],
  SettingsComponent: PeertubeSettings,
  CustomPreviewComponent: PeertubePreview,
  dto: PeerTubeDto,
  maximumCharacters: 10000,
});