import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES = {
  standard: "price_1SFcf4FMMTUWzveiV1TfxvKr",
  professional: "price_1SFch2FMMTUWzveiaqiqpnw8",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get target plan from request body
    const { targetPlan } = await req.json();
    if (!targetPlan || !PLAN_PRICES[targetPlan as keyof typeof PLAN_PRICES]) {
      throw new Error("Invalid target plan");
    }
    logStep("Target plan received", { targetPlan });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please create a subscription first.");
    }
    const customerId = customers.data[0].id;
    logStep("Stripe customer found", { customerId });

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    logStep("Active subscription found", { subscriptionId: subscription.id });

    // Get the current subscription item
    const subscriptionItem = subscription.items.data[0];
    const currentPriceId = subscriptionItem.price.id;
    logStep("Current subscription item", { itemId: subscriptionItem.id, currentPriceId });

    // Check if already on target plan
    const targetPriceId = PLAN_PRICES[targetPlan as keyof typeof PLAN_PRICES];
    if (currentPriceId === targetPriceId) {
      throw new Error("You are already on this plan");
    }

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscriptionItem.id,
          price: targetPriceId,
        },
      ],
      proration_behavior: 'create_prorations', // Calculate prorated amount
      metadata: {
        plan_type: targetPlan,
      },
    });

    logStep("Subscription upgraded successfully", {
      subscriptionId: updatedSubscription.id,
      newPriceId: targetPriceId,
      planType: targetPlan,
    });

    // Update subscription in database
    const { data: businesses } = await supabaseClient
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (businesses) {
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          plan_type: targetPlan,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businesses.id);

      if (updateError) {
        logStep("Warning: Failed to update subscription in database", { error: updateError });
      } else {
        logStep("Subscription updated in database");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Assinatura atualizada com sucesso! O valor será cobrado proporcionalmente.",
        subscription: {
          id: updatedSubscription.id,
          plan: targetPlan,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in upgrade-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
