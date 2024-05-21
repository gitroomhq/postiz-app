'use client';

export const Support = () => {
  if (!process.env.NEXT_PUBLIC_DISCORD_SUPPORT) return null
  return (
    <div className="bg-[#612AD5] fixed right-[20px] bottom-[20px] z-[500] p-[20px] text-white rounded-[20px] cursor-pointer" onClick={() => window.open(process.env.NEXT_PUBLIC_DISCORD_SUPPORT)}>Discord Support</div>
  )
}