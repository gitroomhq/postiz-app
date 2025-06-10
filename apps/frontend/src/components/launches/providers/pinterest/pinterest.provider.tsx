import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { PinterestBoard } from '@gitroom/frontend/components/launches/providers/pinterest/pinterest.board';
import { PinterestSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import { Input } from '@gitroom/react/form/input';
import { ColorPicker } from '@gitroom/react/form/color.picker';
const PinterestSettings: FC = () => {
  const { register, control } = useSettings();
  return (
    <div className="flex flex-col">
      <Input label={'Title'} {...register('title')} />
      <Input label={'Link'} {...register('link')} />
      <PinterestBoard {...register('board')} />
      <ColorPicker
        label="Select Pin Color"
        name="dominant_color"
        enabled={false}
        canBeCancelled={true}
      />
    </div>
  );
};
export default withProvider(
  PinterestSettings,
  undefined,
  PinterestSettingsDto,
  async ([firstItem, ...otherItems]) => {
    const isMp4 = firstItem?.find((item) => item.path.indexOf('mp4') > -1);
    const isPicture = firstItem?.find(
      (item) => item.path.indexOf('mp4') === -1
    );
    if (firstItem.length === 0) {
      return 'Pinterest requires at least one media';
    }
    if (isMp4 && firstItem.length !== 2 && !isPicture) {
      return 'If posting a video to Pinterest you have to also include a cover image as second media';
    }
    if (isMp4 && firstItem.length > 2) {
      return 'If posting a video to Pinterest you can only have two media items';
    }
    if (otherItems.length) {
      return 'Pinterest can only have one post';
    }
    if (
      firstItem.length > 1 &&
      firstItem.every((p) => p.path.indexOf('mp4') == -1)
    ) {
      const loadAll: Array<{
        width: number;
        height: number;
      }> = (await Promise.all(
        firstItem.map((p) => {
          return new Promise((resolve, reject) => {
            const url = new Image();
            url.onload = function () {
              // @ts-ignore
              resolve({ width: this.width, height: this.height });
            };
            url.src = p.path;
          });
        })
      )) as any;
      const checkAllTheSameWidthHeight = loadAll.every((p, i, arr) => {
        return p.width === arr[0].width && p.height === arr[0].height;
      });
      if (!checkAllTheSameWidthHeight) {
        return 'Pinterest requires all images to have the same width and height';
      }
    }
    return true;
  },
  500
);
