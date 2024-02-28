import {LaunchesComponent} from "@gitroom/frontend/components/launches/launches.component";
import {internalFetch} from "@gitroom/helpers/utils/internal.fetch";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Launches',
  description: '',
}

export default async function Index() {
  const {integrations} = await (await internalFetch('/integrations/list')).json();
  return (
      <LaunchesComponent integrations={integrations} />
  );
}
