export const LogoTextComponent = () => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/d3-logo.png"
        alt="D3 Creator"
        width={40}
        height={40}
        suppressHydrationWarning
      />
      <span className="text-[22px] font-semibold leading-none tracking-[-0.025em] text-fg">
        D3 Creator
      </span>
    </div>
  );
};
