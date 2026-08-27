export type RegistrationMode = 'open' | 'approval' | 'disabled';

export const getRegistrationMode = (): RegistrationMode => {
  const mode = (process.env.REGISTRATION_MODE || '').toLowerCase();
  if (mode === 'open' || mode === 'approval' || mode === 'disabled') {
    return mode;
  }

  return process.env.DISABLE_REGISTRATION === 'true' ? 'disabled' : 'open';
};
