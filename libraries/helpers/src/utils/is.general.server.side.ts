export const isGeneralServerSide = () => {
  return !!process.env.IS_GENERAL;
};
