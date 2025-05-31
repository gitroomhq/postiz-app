import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { HashnodePublications } from '@gitroom/frontend/components/launches/providers/hashnode/hashnode.publications';
import { HashnodeTags } from '@gitroom/frontend/components/launches/providers/hashnode/hashnode.tags';
import { HashnodeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import clsx from 'clsx';
import MDEditor from '@uiw/react-md-editor';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { MediaComponent } from '@gitroom/frontend/components/media/media.component';
import { Canonical } from '@gitroom/react/form/canonical';
const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
});
const HashnodePreview: FC = () => {
  const { value } = useIntegration();
  const settings = useSettings();
  const image = useMediaDirectory();
  const [coverPicture, title, subtitle] = settings.watch([
    'main_image',
    'title',
    'subtitle',
  ]);
  return (
    <div
      className={clsx(
        font.className,
        'text-center text-black flex h-[1000px] w-[699.8px] rounded-[10px] bg-white overflow-hidden overflow-y-auto flex-col gap-[32px]'
      )}
    >
      {!!coverPicture?.path && (
        <div className="h-[338.672px]">
          <img
            className="object-cover w-full h-full"
            src={image.set(coverPicture.path)}
            alt="cover_picture"
          />
        </div>
      )}
      <div className="px-[60px]">
        <div className="font-[800] text-[48px] leading-[60px] mb-[8px]">
          {title}
        </div>
        <div className="font-[400] text-[30px] leading-[60px] mb-[8px] text-customColor34">
          {subtitle}
        </div>
      </div>
      <div className="px-[60px] text-start">
        <MDEditor.Markdown
          style={{
            whiteSpace: 'pre-wrap',
            color: 'black',
          }}
          className={font.className}
          skipHtml={true}
          source={value.map((p) => p.content).join('\n')}
        />
      </div>
    </div>
  );
};
const HashnodeSettings: FC = () => {
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
      <MediaComponent
        label="Cover picture"
        description="Add a cover picture"
        {...form.register('main_image')}
      />
      <div className="mt-[20px]">
        <HashnodePublications {...form.register('publication')} />
      </div>
      <div>
        <HashnodeTags label="Tags" {...form.register('tags')} />
      </div>
    </>
  );
};
export default withProvider(
  HashnodeSettings,
  HashnodePreview,
  HashnodeSettingsDto
);
