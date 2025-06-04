import { loadVars } from './variable.context';
export const isGeneral = () => {
  return typeof process.env.IS_GENERAL === 'undefined'
    ? !!process.env.IS_GENERAL
    : loadVars?.()?.isGeneral;
};
