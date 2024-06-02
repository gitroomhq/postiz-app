import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import {LaunchesComponent} from "@gitroom/frontend/components/launches/launches.component";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz Calendar' : 'Gitroom Launches'}`,
  description: '',
}

export default async function Index() {
  return (
      <LaunchesComponent />
  );
}
