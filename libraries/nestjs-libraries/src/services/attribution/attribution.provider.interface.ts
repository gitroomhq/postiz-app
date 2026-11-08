import { Injectable } from '@nestjs/common';

// The new account, as much of it as an attribution tool needs
export interface AttributionLead {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Attribution tools (first / last touch) tell which post, ad or campaign
// every sign-up came from. Their links bring the visitor to the app with a
// click id in `queryParam`, the app keeps it until the account is created,
// and the new account is reported to the tool together with it.
export abstract class AttributionProviderAbstract {
  // URL parameter the tool's links carry the click id in
  abstract queryParam: string;

  // false when the tool isn't configured on this instance
  abstract isEnabled(): boolean;

  // Called once per new account, in the background. clickId is '' when the
  // visitor didn't come from one of the tool's links (or signed up on another
  // browser), the tool can still match the account by email.
  abstract lead(lead: AttributionLead, clickId: string): Promise<void>;
}

export interface AttributionProviderParams {
  provider: string;
}

export function AttributionProvider(params: AttributionProviderParams) {
  return function (target: any) {
    Injectable()(target);

    const existingMetadata =
      Reflect.getMetadata('attribution-provider', AttributionProviderAbstract) ||
      [];

    existingMetadata.push({ target, provider: params.provider });

    Reflect.defineMetadata(
      'attribution-provider',
      existingMetadata,
      AttributionProviderAbstract
    );
  };
}
