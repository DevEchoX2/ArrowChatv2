import Stripe from "stripe";

// Initialise only on the server side – safely returns null when
// STRIPE_SECRET_KEY is not yet configured so the app boots without crashing.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export const STRIPE_MONTHLY_PRICE_ID =
  process.env.STRIPE_MONTHLY_PRICE_ID ?? "";

export const STRIPE_ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID ?? "";

export const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET ?? "";
