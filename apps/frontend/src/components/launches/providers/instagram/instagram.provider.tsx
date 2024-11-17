import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { FC } from 'react';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

const postType = [
  {
    value: 'post',
    label: 'Post',
  },
  {
    value: 'story',
    label: 'Story',
  },
];
const InstagramProvider: FC<{ values?: any }> = (props) => {
  const { watch, register, formState, control } = useSettings();

  return (
    <>
      <Select
        label="Post Type"
        {...register('post_type', {
          value: '',
        })}
      >
        <option value="">Select Post Type...</option>
        {postType.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
    </>
  );
};

export default withProvider(
  InstagramProvider,
  undefined,
  undefined,
  async ([firstPost, ...otherPosts]) => {
    if (!firstPost.length) {
      return 'Instagram should have at least one media';
    }

    return true;
  },
  2200
);
