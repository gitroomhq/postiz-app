export const hasExtension = (
  path: string | undefined | null,
  extension: string
): boolean => {
  if (!path) {
    return false;
  }
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return path.toLowerCase().indexOf(ext.toLowerCase()) > -1;
};
