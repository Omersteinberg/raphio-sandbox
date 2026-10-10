// Credit packs, one source for landing, Buy Credits and FAQ.
export const PACKS = [
  { id: 'starter', stripeId: 6, label: 'Starter', price: 29, credits: 6, example: 'two 15s videos, or one 30s video' },
  { id: 'creator', stripeId: 12, label: 'Creator', price: 55, credits: 12, popular: true, example: 'two 30s videos, or one 60s video' },
  { id: 'studio', stripeId: 24, label: 'Studio', price: 99, credits: 24, example: 'two 60s videos, or four 30s videos' },
];

const BASE = PACKS[0].price / PACKS[0].credits;

// Dollars per credit for a pack.
export const perCredit = (p) => p.price / p.credits;

// Percent saved against Starter, 0 for Starter.
export const savePct = (p) => Math.round((1 - perCredit(p) / BASE) * 100);
