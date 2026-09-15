import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIFETIME_PRICE,
  LIFETIME_RETENTION_PRICE,
  PREVIOUS_LIFETIME_PRICE,
  foundingChargeCents,
  lifetimeCheckoutQuotedCents,
  pricing,
} from './pricing.ts';

describe('lifetime vs monthly Pro prices', () => {
  it('keeps founding at 99 and monthly Pro at 49', () => {
    assert.equal(LIFETIME_PRICE, 99);
    assert.equal(pricing.PRO.month_price, 49);
  });

  it('halves the founding fee for retention', () => {
    assert.equal(LIFETIME_RETENTION_PRICE, LIFETIME_PRICE / 2);
  });

  it('freezes in-flight deferred charges at the previous quote', () => {
    assert.equal(PREVIOUS_LIFETIME_PRICE, 49);
    assert.equal(foundingChargeCents(undefined), PREVIOUS_LIFETIME_PRICE * 100);
    assert.equal(foundingChargeCents(null), PREVIOUS_LIFETIME_PRICE * 100);
    assert.equal(
      foundingChargeCents(String(PREVIOUS_LIFETIME_PRICE * 100)),
      PREVIOUS_LIFETIME_PRICE * 100
    );
  });

  it('charges new purchases at the current founding price', () => {
    assert.equal(lifetimeCheckoutQuotedCents(undefined), LIFETIME_PRICE * 100);
    assert.equal(foundingChargeCents(LIFETIME_PRICE * 100), LIFETIME_PRICE * 100);
    assert.equal(
      lifetimeCheckoutQuotedCents(String(PREVIOUS_LIFETIME_PRICE * 100)),
      PREVIOUS_LIFETIME_PRICE * 100
    );
  });
});
