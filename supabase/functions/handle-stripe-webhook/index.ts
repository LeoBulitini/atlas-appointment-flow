import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Mapeamento de price_id para plan_type
const PRICE_TO_PLAN: { [key: string]: "standard" | "professional" } = {
  "price_1SFcf4FMMTUWzveiV1TfxvKr": "standard",
  "price_1SFch2FMMTUWzveiaqiqpnw8": "professional",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing signature or webhook secret");
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event verified", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription", { id: subscription.id, status: subscription.status });

        const businessId = subscription.metadata?.business_id;
        
        // Get plan type from metadata or price_id
        let planType: "standard" | "professional" | undefined = subscription.metadata?.plan_type as "standard" | "professional" | undefined;
        
        // If metadata doesn't have plan_type, try to get it from price_id
        if (!planType && subscription.items.data[0]?.price?.id) {
          const priceId = subscription.items.data[0].price.id;
          planType = PRICE_TO_PLAN[priceId];
          logStep("Plan type detected from price_id", { priceId, planType });
        }

        if (!businessId) {
          throw new Error("Missing business_id in subscription metadata");
        }

        if (!planType) {
          throw new Error("Could not determine plan_type from metadata or price_id");
        }

        // Check if this is a plan change (upgrade or downgrade)
        if (event.type === "customer.subscription.updated") {
          // Get old plan type from database
          const { data: oldSubscription } = await supabaseClient
            .from("subscriptions")
            .select("plan_type")
            .eq("business_id", businessId)
            .single();
          
          const oldPlanType = oldSubscription?.plan_type;
          
          if (oldPlanType && oldPlanType !== planType) {
            logStep("Plan change detected", { 
              oldPlanType, 
              newPlanType: planType, 
              businessId 
            });
            
            // If downgrading from Professional to Standard, deactivate loyalty
            if (oldPlanType === "professional" && planType === "standard") {
              logStep("Downgrade detected - deactivating loyalty programs");
              
              const { error: loyaltyError } = await supabaseClient
                .from("loyalty_programs")
                .update({ is_active: false })
                .eq("business_id", businessId);
              
              if (loyaltyError) {
                logStep("Warning: Could not deactivate loyalty program", { error: loyaltyError.message });
              } else {
                logStep("Loyalty program deactivated due to downgrade");
              }
            }
          }
        }

        // Upsert subscription
        const { error: upsertError } = await supabaseClient
          .from("subscriptions")
          .upsert({
            business_id: businessId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            plan_type: planType,
            status: subscription.status as any,
            trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "business_id"
          });

        if (upsertError) {
          throw new Error(`Error upserting subscription: ${upsertError.message}`);
        }

        logStep("Subscription upserted successfully");
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription deletion", { id: subscription.id });

        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          throw new Error(`Error updating subscription: ${updateError.message}`);
        }

        logStep("Subscription marked as canceled");
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id });

        if (invoice.subscription) {
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (updateError) {
            throw new Error(`Error updating subscription status: ${updateError.message}`);
          }

          logStep("Subscription marked as active");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });

        if (invoice.subscription) {
          const { error: updateError } = await supabaseClient
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (updateError) {
            throw new Error(`Error updating subscription status: ${updateError.message}`);
          }

          logStep("Subscription marked as past_due");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
