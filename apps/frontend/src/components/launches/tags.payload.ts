/** Shape `/posts` persists: `tags.map((tag) => tag.label)`. */
export type PostTagPayload = { label: string; value: string };

/**
 * The picker keeps full tag rows (`id`, `name`, `color`). The schedule payload
 * only understands `{ label, value }`. Sending the raw row drops the tag.
 */
export const tagsToPostPayload = (
  items: Array<{ label?: string; name?: string; value?: string }>
): PostTagPayload[] =>
  items
    .map((item) => {
      const name = item.label || item.name || item.value || '';
      return { label: name, value: name };
    })
    .filter((item) => item.label);
