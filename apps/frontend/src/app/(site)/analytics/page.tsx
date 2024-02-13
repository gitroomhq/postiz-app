import {AnalyticsComponent} from "@gitroom/frontend/components/analytics/analytics.component";
import {internalFetch} from "@gitroom/helpers/utils/internal.fetch";

export default async function Index() {
  const analytics = await (await internalFetch('/analytics')).json();
  const trending = await (await internalFetch('/analytics/trending')).json();
  const stars = await (await internalFetch('/analytics/stars', {
    body: JSON.stringify({page: 1}),
    method: 'POST'
  })).json();

  return (
      <AnalyticsComponent list={analytics} trending={trending} stars={stars.stars} />
  );
}
