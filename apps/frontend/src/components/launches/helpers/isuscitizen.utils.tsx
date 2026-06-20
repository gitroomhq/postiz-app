export const isUSCitizen = () => {
  const userLanguage = localStorage.getItem('isUS') || ((navigator.language || navigator.languages[0]).startsWith('en-US') ? 'US' : 'GLOBAL');
  return userLanguage === 'US';
};
