#!/usr/bin/env node
//
// Creates the Stripe prices the subscribe flow needs, in **test mode only**.
//
//   node scripts/stripe-test-fixtures.mjs --dry
//   node scripts/stripe-test-fixtures.mjs
//   node scripts/stripe-test-fixtures.mjs --revoke
//
// Why this is needed at all: `stripe.service.ts:304` finds a price by matching
// `p.nickname === body.billing + ' ' + body.period` — "CREATOR MONTHLY" and so
// on. A Stripe account without those nicknames cannot complete a subscription,
// which is why none of doc 03's subscription states had ever been seen. The
// amounts come from `pricing.ts` so the fixture cannot drift from the product.
//
// Idempotent: a price whose nickname already exists is left alone. `--revoke`
// archives what it made (Stripe does not delete prices, by design — an invoice
// has to keep pointing at what it charged).
//
// It refuses to run against a live key. That check is first, before anything is
// read or written, because "test fixtures" against production is the one
// mistake here that cannot be undone.
import Stripe from 'stripe';

const dry = process.argv.includes('--dry');
const revoke = process.argv.includes('--revoke');

const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test')) {
  console.error(
    'Refusing: STRIPE_SECRET_KEY is not a test key. This script creates ' +
      'products and prices, and it will not do that against a live account.'
  );
  process.exit(2);
}

const stripe = new Stripe(key);

const PRODUCT_NAME = 'PostQueen (dev fixtures)';

// Mirrors pricing.ts. Kept as plain numbers rather than imported because this is
// a node script with no TS build step; if the two disagree, pricing.ts is right
// and this file is stale.
const TIERS = [
  ['CREATOR', 20, 132],
  ['GROWTH', 33, 264],
  ['PRO', 49, 396],
  ['AGENCY', 99, 792],
];

async function findProduct() {
  const list = await stripe.products.list({ limit: 100, active: true });
  return list.data.find((p) => p.name === PRODUCT_NAME);
}

async function main() {
  const existingPrices = await stripe.prices.list({ limit: 100, active: true });
  const byNickname = new Map(
    existingPrices.data.filter((p) => p.nickname).map((p) => [p.nickname, p])
  );

  if (revoke) {
    const mine = existingPrices.data.filter(
      (p) => p.nickname && TIERS.some(([t]) => p.nickname.startsWith(t + ' '))
    );
    console.log(`${dry ? '[dry] would archive' : 'archiving'} ${mine.length} price(s)`);
    if (!dry) {
      for (const p of mine) await stripe.prices.update(p.id, { active: false });
      const prod = await findProduct();
      if (prod) await stripe.products.update(prod.id, { active: false });
    }
    return;
  }

  let product = await findProduct();
  if (!product) {
    console.log(`${dry ? '[dry] would create' : 'creating'} product "${PRODUCT_NAME}"`);
    if (!dry) product = await stripe.products.create({ name: PRODUCT_NAME });
  } else {
    console.log(`product already here: ${product.id}`);
  }

  for (const [tier, monthly, yearly] of TIERS) {
    for (const [period, amount, interval] of [
      ['MONTHLY', monthly, 'month'],
      ['YEARLY', yearly, 'year'],
    ]) {
      const nickname = `${tier} ${period}`;
      if (byNickname.has(nickname)) {
        console.log(`  ${nickname.padEnd(16)} already here`);
        continue;
      }
      console.log(
        `  ${dry ? '[dry] would create' : 'creating'} ${nickname.padEnd(16)} $${amount}/${interval}`
      );
      if (dry) continue;
      await stripe.prices.create({
        product: product.id,
        nickname,
        currency: 'usd',
        unit_amount: amount * 100,
        recurring: { interval },
        // The subscribe flow matches on nickname; the lookup key is here so
        // `getPackages()` can find these too, once it stops asking for the
        // retired tier names.
        lookup_key: `${tier.toLowerCase()}_${period.toLowerCase()}`,
      });
    }
  }

  console.log(dry ? 'Dry run — nothing was created.' : 'done');
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
