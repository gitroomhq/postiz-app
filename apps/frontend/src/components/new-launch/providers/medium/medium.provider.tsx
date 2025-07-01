'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { MediumPublications } from '@gitroom/frontend/components/new-launch/providers/medium/medium.publications';
import { MediumTags } from '@gitroom/frontend/components/new-launch/providers/medium/medium.tags';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import clsx from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import { Canonical } from '@gitroom/react/form/canonical';
import interClass from '@gitroom/react/helpers/inter.font';

const MediumPreview: FC = () => {
  const { value } = useIntegration();
  const settings = useSettings();
  const [title, subtitle] = settings.watch(['title', 'subtitle']);
  return (
    <div
      className={clsx(
        `font-[800] flex h-[1000px] w-[699.8px] text-customColor35 ${interClass} rounded-[10px] bg-white overflow-hidden overflow-y-auto flex-col gap-[56px]`
      )}
    >
      <div className="px-[60px] pt-[20px]">
        <div className="text-[48px] leading-[60px] mb-[8px]">{title}</div>
        <div className="text-[22px] font-[400] text-customColor36">
          {subtitle}
        </div>
      </div>
      <div className="px-[60px]">
        <MDEditor.Markdown
          style={{
            whiteSpace: 'pre-wrap',
            color: '#242424',
          }}
          skipHtml={true}
          source={value.map((p) => p.content).join('\n')}
        />
      </div>
    </div>
  );
};
const MediumSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Input label="Subtitle" {...form.register('subtitle')} />
      <Canonical
        date={date}
        label="Canonical Link"
        {...form.register('canonical')}
      />
      <div>
        <MediumPublications {...form.register('publication')} />
      </div>
      <div>
        <MediumTags label="Topics" {...form.register('tags')} />
      </div>
    </>
  );
};
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: MediumSettings,
  CustomPreviewComponent: MediumPreview,
  dto: MediumSettingsDto,
  checkValidity: undefined,
  maximumCharacters: undefined,
});
