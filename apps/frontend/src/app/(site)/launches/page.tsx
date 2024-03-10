export const dynamic = 'force-dynamic';

import {LaunchesComponent} from "@gitroom/frontend/components/launches/launches.component";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Gitroom Launches',
  description: '',
}

export default async function Index() {
  return (
      <LaunchesComponent />
  );
}
