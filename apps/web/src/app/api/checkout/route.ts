import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 }
    );
  }

  let body: { plan?: string; userId?: string };
  try {
    body = (await req.json()) as { plan?: string; userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { plan, userId } = body;
  if (!plan || !["monthly", "annual"].includes(plan)) {
    return NextResponse.json(
      { error: 'plan must be "monthly" or "annual"' },
      { status: 400 }
    );
  }

  const priceId =
    plan === "annual" ? STRIPE_ANNUAL_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID for plan "${plan}" is not configured.` },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?tab=premium`,
      metadata: { userId: userId ?? "" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
