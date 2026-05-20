import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  const rawBody = await req.arrayBuffer();

  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody),
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature error";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  // ── Handle events ───────────────────────────────────────────────────────
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = (session.metadata as Record<string, string>)?.userId;
      // TODO: Upgrade user tier in your database
      console.log(`[webhook] Checkout completed for userId=${userId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      // TODO: Downgrade user to free tier
      console.log(`[webhook] Subscription cancelled: ${(sub as { id: string }).id}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      // TODO: Notify user of payment failure
      console.log(`[webhook] Payment failed: ${(invoice as { id: string }).id}`);
      break;
    }

    default:
      // Unhandled event type — safe to ignore
      break;
  }

  return NextResponse.json({ received: true });
}
