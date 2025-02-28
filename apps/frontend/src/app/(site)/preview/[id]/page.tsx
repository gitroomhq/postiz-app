import { Preview } from "@gitroom/frontend/components/preview/preview";
import { isGeneralServerSide } from "@gitroom/helpers/utils/is.general.server.side";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Preview`,
  description: 'Make a preview link for your posts.',
}

export default async function Index({ params }: { params: { id: string } }) {
  return (
    <Preview id={params.id} />
  );
}
