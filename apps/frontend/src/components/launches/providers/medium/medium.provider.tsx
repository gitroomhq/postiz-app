import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { MediumPublications } from '@gitroom/frontend/components/launches/providers/medium/medium.publications';
import { MediumTags } from '@gitroom/frontend/components/launches/providers/medium/medium.tags';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import clsx from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import localFont from 'next/font/local';
import { Canonical } from '@gitroom/react/form/canonical';
import interClass from '@gitroom/react/helpers/inter.font';
const charter = localFont({
  src: [
    {
      path: './fonts/Charter Regular.ttf',
      weight: 'normal',
      style: 'normal',
    },
    {
      path: './fonts/Charter Italic.ttf',
      weight: 'normal',
      style: 'italic',
    },
    {
      path: './fonts/Charter Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/Charter Bold Italic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
});
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
          className={charter.className}
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
export default withProvider(MediumSettings, MediumPreview, MediumSettingsDto);
