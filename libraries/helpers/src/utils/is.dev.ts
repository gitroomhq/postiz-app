export const isDev = () => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};
