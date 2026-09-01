import clsx from 'clsx';

// Shared look for every header dropdown (organization, theme, language,
// notifications) so they read as one system instead of four one-off
// popovers - see the theme picker for the reference look this was lifted
// from.
export const dropdownPanelClass = (open: boolean, extra?: string) =>
  clsx(
    'z-[300] absolute top-[100%] end-0 translate-y-[10px] p-[8px] bg-newBgColorInner shadow-menu rounded-[12px] border border-tableBorder flex-col animate-fadeIn text-newTextColor',
    open ? 'flex' : 'hidden',
    extra
  );

export const dropdownRowClass = (selected?: boolean, extra?: string) =>
  clsx(
    'flex items-center gap-[8px] h-[40px] px-[10px] rounded-[8px] text-[14px] cursor-pointer whitespace-nowrap',
    selected ? 'bg-btnPrimary text-white hover:bg-btnPrimary' : 'hover:bg-newBgColor',
    extra
  );
