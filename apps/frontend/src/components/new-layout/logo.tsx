'use client';

export const Logo = () => {
  return (
    <div className="mt-1 flex flex-col items-center gap-1 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/d3-logo.png"
        alt="D3"
        width={32}
        height={32}
        suppressHydrationWarning
      />
      <span className="text-[10px] leading-none tracking-[0.04em] uppercase text-fgMuted">
        Creator
      </span>
    </div>
  );
};
