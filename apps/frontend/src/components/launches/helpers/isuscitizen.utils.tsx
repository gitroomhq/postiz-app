export const isUSCitizen = () => {
  const userLanguage = navigator.language || navigator.languages[0];
  return userLanguage.startsWith('en-US');
};
