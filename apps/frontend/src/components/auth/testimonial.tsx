export const Testimonial = () => {
  return (
    <div className="rounded-[16px] w-full flex flex-col gap-[16px] p-[20px] bg-[#1A1919] border border-[#2b2a2a]">
      <div className="flex gap-[12px]">
        <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-white" />
        <div className="flex-col -mt-[4px]">
          <div className="text-[16px] font-[700]">name</div>
          <div className="text-[11px] font-[400] text-[#D1D1D1]">description</div>
        </div>
      </div>
      <div className="text-[12px] font-[400] text-[#FFF]">
        content
      </div>
    </div>
  );
};
