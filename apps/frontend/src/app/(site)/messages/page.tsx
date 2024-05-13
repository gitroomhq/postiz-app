export const dynamic = 'force-dynamic';

import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Messages',
  description: '',
}

export default async function Index() {
  return (
     <div className="bg-[#0b0f1c] h-[951px] flex flex-col rounded-[4px] border border-[#172034]">
       <div className="bg-[#0F1524] h-[64px]" />
       <div className="flex-1 flex justify-center items-center text-[20px]">
         Select a conversation and chat away.
       </div>
     </div>
  );
}
