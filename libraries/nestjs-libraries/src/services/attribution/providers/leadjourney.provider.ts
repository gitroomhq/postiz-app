import {
  AttributionLead,
  AttributionProvider,
  AttributionProviderAbstract,
} from '@gitroom/nestjs-libraries/services/attribution/attribution.provider.interface';
import { timer } from '@gitroom/helpers/utils/timer';

// LeadJourney rejects the whole lead (422) when click_id isn't a UUID
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// LeadJourney's script stays on the website only: it reads every form on the
// page, and the app's forms hold private data. LeadJourney decorates the
// website's links to the app with lj_click_id ("link decoration", enabled by
// them for the app domain) and every new account is sent as one "Lead"
// postback.
// https://help.leadjourney.io/docs/integrations/send-events-custom-crm
@AttributionProvider({ provider: 'leadjourney' })
export class LeadJourneyProvider extends AttributionProviderAbstract {
  queryParam = 'lj_click_id';

  isEnabled() {
    return (
      !!process.env.LEADJOURNEY_POSTBACK_URL &&
      !!process.env.LEADJOURNEY_POSTBACK_SECRET
    );
  }

  async lead(lead: AttributionLead, clickId: string) {
    const click_id = UUID.test(clickId) ? clickId : '';
    // nothing LeadJourney could match the account with
    if (!click_id && !lead.email) {
      return;
    }

    const body = JSON.stringify({
      type: 'Lead',
      click_id,
      tag: 'signup',
      email: lead.email,
      firstname: lead.firstName,
      lastname: lead.lastName,
    });

    // One retry after a timeout or a 5xx (LeadJourney: a retry within 60s
    // doesn't create a duplicate). A 4xx means the request itself is wrong,
    // sending it again won't help.
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(process.env.LEADJOURNEY_POSTBACK_URL!, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.LEADJOURNEY_POSTBACK_SECRET}`,
            'Content-Type': 'application/json',
          },
          body,
          // a shorter timeout loses leads
          signal: AbortSignal.timeout(15000),
        });

        // reading / dropping the body must not land in the catch below, it
        // would send an accepted (or rejected) lead again
        if (response.ok) {
          await response.body?.cancel().catch(() => {});
          return;
        }

        console.error(
          `LeadJourney rejected the lead of user ${lead.id}:`,
          response.status,
          await response.text().catch(() => '')
        );

        if (response.status < 500) {
          return;
        }
      } catch (err) {
        console.error(
          `LeadJourney failed to send the lead of user ${lead.id}:`,
          err
        );
      }

      if (attempt === 1) {
        await timer(5000);
      }
    }
  }
}
