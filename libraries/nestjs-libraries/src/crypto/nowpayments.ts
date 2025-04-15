import { Injectable } from '@nestjs/common';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

export interface ProcessPayment {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  created_at: string;
  updated_at: string;
  outcome_amount: number;
  outcome_currency: string;
}

@Injectable()
export class Nowpayments {
  constructor(private _subscriptionService: SubscriptionService) {}

  async processPayment(path: string, body: ProcessPayment) {
    const decrypt = AuthService.verifyJWT(path) as any;
    if (!decrypt || !decrypt.order_id) {
      return;
    }

    if (
      body.payment_status !== 'confirmed' &&
      body.payment_status !== 'finished'
    ) {
      return;
    }

    const [org, make] = body.order_id.split('_');
    await this._subscriptionService.lifeTime(org, make, 'PRO');
    return body;
  }

  async createPaymentPage(orgId: string) {
    const onlyId = makeId(5);
    const make = orgId + '_' + onlyId;
    const signRequest = AuthService.signJWT({ order_id: make });

    const { id, invoice_url } = await (
      await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
        },
        body: JSON.stringify({
          price_amount: process.env.NOWPAYMENTS_AMOUNT,
          price_currency: 'USD',
          order_id: make,
          pay_currency: 'SOL',
          order_description: 'Lifetime deal account for Postiz',
          ipn_callback_url:
            process.env.NEXT_PUBLIC_BACKEND_URL +
            `/public/crypto/${signRequest}`,
          success_url: process.env.FRONTEND_URL + `/launches?check=${onlyId}`,
          cancel_url: process.env.FRONTEND_URL,
        }),
      })
    ).json();

    return {
      id,
      invoice_url,
    };
  }
}
