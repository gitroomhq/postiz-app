#!/usr/bin/env node
//
// Drives a subscription through its whole life in Stripe **test mode**, and
// replays each real event into this backend's own webhook route.
//
//   node scripts/stripe-test-drive.mjs --org <id> --start --tier CREATOR
//   node scripts/stripe-test-drive.mjs --org <id> --cancel
//   node scripts/stripe-test-drive.mjs --org <id> --reactivate
//   node scripts/stripe-test-drive.mjs --org <id> --coupon SAVE20
//   node scripts/stripe-test-drive.mjs --org <id> --end
//   node scripts/stripe-test-drive.mjs --org <id> --show
//
// Why replay rather than `stripe listen`: the CLI is not installed here, and a
// hosted webhook cannot reach localhost anyway. The events are **real** — they
// come out of `stripe.events.list()` after a real API call — and they are signed
// with the same secret the backend was started with, so `constructEvent`
// verifies them exactly as it would in production. What is being tested is this
// repo's handler, and that part is not simulated at all.
//
// `active`, `canceling`, `ended` and `discount` were the last states in doc 03
// with nothing behind them. Every one needs a card, and a card in test mode is
// `pm_card_visa`.
//
// Refuses a live key before it reads or writes anything.
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const has = (name) => process.argv.includes(`--${name}`);

const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test')) {
  console.error(
    'Refusing: STRIPE_SECRET_KEY is not a test key. This creates customers, ' +
      'subscriptions and charges, and it will not do that against a live account.'
  );
  process.exit(2);
}

const signing = process.env.STRIPE_SIGNING_KEY || '';
const backend = process.env.PQ_BACKEND || 'http://localhost:3000';
const orgId = arg('org');
const tier = arg('tier') || 'CREATOR';
const period = arg('period') || 'MONTHLY';

const stripe = new Stripe(key);
const prisma = new PrismaClient();

// Must match SUBSCRIPTION_SERVICE_TAG in stripe.service.ts — the webhook route
// drops anything whose metadata.service is something else, so a wrong value
// here means every delivery returns {ok:true} and nothing happens.
const SERVICE_TAG = 'postqueen';
// Mirrors pricing.ts; if the two disagree, pricing.ts is right.
const PRICE = { CREATOR: 20, GROWTH: 33, PRO: 49, AGENCY: 99 };

/** POST one event to the backend with a signature it will accept. */
async function deliver(event) {
  const payload = JSON.stringify(event, null, 2);
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: signing,
  });
  const res = await fetch(`${backend}/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
  const text = await res.text();
  console.log(`  → ${event.type.padEnd(32)} ${res.status} ${text.slice(0, 80)}`);
  return res.status;
}

/** Every event Stripe emitted for this subscription since `since`, oldest first. */
async function replaySince(since, subscriptionId) {
  const list = await stripe.events.list({ limit: 40, created: { gte: since } });
  const mine = list.data
    .filter((e) => {
      const o = e.data?.object;
      return (
        o?.id === subscriptionId ||
        o?.subscription === subscriptionId ||
        // An invoice points at its subscription through `parent` in this API
        // version. Without this line the two invoice events — the ones that
        // say a renewal was paid or refused — were filtered out of every
        // replay, which is why the first failed renewal looked like it emitted
        // nothing but subscription updates.
        o?.parent?.subscription_details?.subscription === subscriptionId
      );
    })
    .reverse();
  if (!mine.length) {
    console.log('  (no events yet — Stripe can lag a second; rerun --replay)');
  }
  for (const e of mine) await deliver(e);
  return mine.length;
}

/**
 * A customer on a **test clock**, so time can be moved instead of waited out.
 *
 * The three things nothing in this migration had ever seen — a trial reaching
 * its last day, a cancellation landing at the period end, a renewal being
 * refused — are all "seven days from now" events. A test clock is Stripe's own
 * answer to that: the customer, its subscription and its invoices all live on a
 * clock this script advances, and every webhook Stripe emits along the way is
 * real.
 *
 * A clock customer cannot be an existing one — Stripe refuses to attach a clock
 * to a customer that already has history — so this makes a fresh one and points
 * the organization at it. `--drop-clock` puts the original back and deletes the
 * clock with everything on it.
 */
async function clockCustomerFor(org) {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: `postqueen dev ${org.id.slice(0, 8)}`,
  });
  const created = await stripe.customers.create({
    name: `${org.name} (test clock)`,
    email: `dev+clock-${org.id.slice(0, 8)}@postqueen.invalid`,
    test_clock: clock.id,
  });
  await prisma.organization.update({
    where: { id: org.id },
    data: { paymentId: created.id },
  });
  console.log(`  clock ${clock.id}, customer ${created.id}`);
  return created.id;
}

/** Move the clock forward and wait for Stripe to finish replaying the world. */
async function advance(customer, days) {
  const c = await stripe.customers.retrieve(customer);
  const clockId = typeof c.test_clock === 'string' ? c.test_clock : c.test_clock?.id;
  if (!clockId) {
    throw new Error('This customer is not on a test clock — start with --clock.');
  }
  const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
  const to = clock.frozen_time + days * 86400;
  console.log(
    `advancing ${days} day(s) to ${new Date(to * 1000).toISOString().slice(0, 16)}`
  );
  // The clock id is a positional argument, not an option — passing it in the
  // options bag makes Stripe complain that `test_clock` is an object.
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: to });
  for (let i = 0; i < 120; i++) {
    const now = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (now.status === 'ready') return now.frozen_time;
    if (now.status === 'internal_failure') throw new Error('test clock failed');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('test clock did not settle');
}

async function customerFor(org) {
  if (org.paymentId) {
    try {
      const c = await stripe.customers.retrieve(org.paymentId);
      if (!c.deleted) return c.id;
    } catch {
      /* fall through and make a new one */
    }
  }
  const created = await stripe.customers.create({
    name: org.name,
    email: `dev+${org.id.slice(0, 8)}@postqueen.invalid`,
  });
  await prisma.organization.update({
    where: { id: org.id },
    data: { paymentId: created.id },
  });
  console.log(`  customer ${created.id} (written to organization.paymentId)`);
  return created.id;
}

async function priceFor() {
  const amount = PRICE[tier] * 100;
  const interval = period === 'MONTHLY' ? 'month' : 'year';
  const products = await stripe.products.list({ active: true, limit: 100 });
  const product =
    products.data.find((p) => p.name.toUpperCase() === tier) ||
    (await stripe.products.create({ name: tier, tax_code: 'txcd_10103001' }));
  const prices = await stripe.prices.list({ active: true, product: product.id, limit: 100 });
  return (
    prices.data.find(
      (p) => p.recurring?.interval === interval && p.unit_amount === amount
    ) ||
    (await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      nickname: `${tier} ${period}`,
      unit_amount: amount,
      tax_behavior: 'exclusive',
      recurring: { interval },
    }))
  );
}

async function currentSubscription(customer) {
  const list = await stripe.subscriptions.list({ customer, status: 'all', limit: 10 });
  return list.data.find((s) => ['active', 'trialing', 'past_due'].includes(s.status));
}

async function show() {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  console.log(`  local:  ${sub ? `${sub.subscriptionTier} · ${sub.totalChannels} ch · cancelAt=${sub.cancelAt} · identifier=${sub.identifier}` : 'no subscription row'}`);
  console.log(`  org:    trial=${org?.isTrailing} allowTrial=${org?.allowTrial} paymentId=${org?.paymentId || '(none)'}`);
  if (org?.paymentId) {
    const s = await currentSubscription(org.paymentId);
    console.log(`  stripe: ${s ? `${s.id} ${s.status} cancel_at_period_end=${s.cancel_at_period_end} discount=${!!s.discounts?.length}` : 'no live subscription'}`);
  }
}

async function main() {
  if (!orgId) {
    console.error('--org <id> is required.');
    process.exitCode = 2;
    return;
  }
  if (has('show')) return show();
  if (!signing) {
    console.error(
      'STRIPE_SIGNING_KEY is not set. The backend validates every webhook with ' +
        'it, so without one nothing can be delivered. Export the same value here ' +
        'and in the backend process.'
    );
    process.exitCode = 2;
    return;
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    console.error(`No organization ${orgId}.`);
    process.exitCode = 2;
    return;
  }
  const owner = await prisma.userOrganization.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  });

  if (has('drop-clock')) {
    const c = org.paymentId
      ? await stripe.customers.retrieve(org.paymentId).catch(() => null)
      : null;
    const clockId =
      c && !c.deleted
        ? typeof c.test_clock === 'string'
          ? c.test_clock
          : c.test_clock?.id
        : null;
    if (!clockId) {
      console.log('This organization is not on a test clock — nothing to drop.');
      return show();
    }
    console.log(`deleting clock ${clockId} and everything on it`);
    await stripe.testHelpers.testClocks.del(clockId);
    await prisma.organization.update({
      where: { id: orgId },
      data: { paymentId: null },
    });
    await prisma.subscription.deleteMany({ where: { organizationId: orgId } });
    return show();
  }

  const customer = has('clock')
    ? await clockCustomerFor(org)
    : await customerFor(org);
  // `--replay` re-delivers what a previous run emitted, so it has to look
  // further back than the few seconds an action of its own needs.
  const since =
    Math.floor(Date.now() / 1000) - (has('replay') ? 3600 : 5);

  if (has('start')) {
    const existing = await currentSubscription(customer);
    if (existing) {
      console.log(`Already subscribed in Stripe (${existing.id}) — nothing to start.`);
      return show();
    }
    const card = arg('card') || 'pm_card_visa';
    const pm = await stripe.paymentMethods.attach(card, { customer });
    await stripe.customers.update(customer, {
      invoice_settings: { default_payment_method: pm.id },
    });
    const price = await priceFor();
    console.log(`starting ${tier} ${period} on ${customer} with ${card}`);
    const sub = await stripe.subscriptions.create({
      customer,
      items: [{ price: price.id }],
      default_payment_method: pm.id,
      ...(org.allowTrial && !has('no-trial') ? { trial_period_days: 7 } : {}),
      // The same shape createCheckoutSession writes. createSubscription() reads
      // billing/period/uniqueId straight off it, so a subscription without them
      // lands in the database as `undefined` tier.
      metadata: {
        service: SERVICE_TAG,
        billing: tier,
        period,
        userId: owner?.userId || '',
        uniqueId: 'dev-test-drive',
        ud: 'dev-test-drive',
      },
    });
    console.log(`  ${sub.id} ${sub.status}`);
    await new Promise((r) => setTimeout(r, 2500));
    await replaySince(since, sub.id);
    return show();
  }

  if (has('advance')) {
    const days = parseFloat(arg('advance') || '8');
    const sub = await currentSubscription(customer);
    await advance(customer, days);
    // Stripe emits the whole week's worth at once and takes a moment to finish.
    await new Promise((r) => setTimeout(r, 4000));
    const n = await replaySince(since, sub?.id);
    console.log(`  ${n} event(s) replayed`);
    return show();
  }

  const sub = await currentSubscription(customer);
  if (!sub && !has('replay')) {
    console.error('No live subscription for this organization — run --start first.');
    process.exitCode = 2;
    return;
  }

  if (has('cancel')) {
    console.log(`cancelling ${sub.id} at period end`);
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  } else if (has('reactivate')) {
    console.log(`reactivating ${sub.id}`);
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: false });
  } else if (has('coupon')) {
    const code = arg('coupon') || 'DEV20';
    const coupon =
      (await stripe.coupons.list({ limit: 100 })).data.find((c) => c.name === code) ||
      (await stripe.coupons.create({ name: code, percent_off: 20, duration: 'forever' }));
    console.log(`applying coupon ${coupon.id} (${code}, 20% off) to ${sub.id}`);
    await stripe.subscriptions.update(sub.id, { discounts: [{ coupon: coupon.id }] });
  } else if (has('end')) {
    console.log(`ending ${sub.id} now`);
    await stripe.subscriptions.cancel(sub.id);
  } else if (!has('replay')) {
    console.error('Nothing to do — pass --start, --cancel, --reactivate, --coupon, --end, --replay or --show.');
    process.exitCode = 2;
    return;
  }

  await new Promise((r) => setTimeout(r, 2500));
  await replaySince(since, sub?.id);
  await show();
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
