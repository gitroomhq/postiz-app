/**
 * Continue with Google / Apple / etc. These chips stay white with dark type
 * in both themes, so hover cannot use `boxHover` (that token is a dark fill
 * and turns the button into a black slab).
 */
export const oauthButtonClass =
  'cursor-pointer w-full bg-white border border-newBorder hover:bg-[#F2F2F2] transition-colors h-[52px] rounded-[10px] flex justify-center items-center text-[#0E0E0E] gap-[10px] text-[15px] font-[500]';
