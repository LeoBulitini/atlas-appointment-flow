import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de price_id para plan_type
const PRICE_TO_PLAN: { [key: string]: "standard" | "professional" } = {
  "price_1SFcf4FMMTUWzveiV1TfxvKr": "standard",
  "price_1SFch2FMMTUWzveiaqiqpnw8": "professional",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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

    // Get business_id
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      throw new Error(`Error fetching business: ${businessError.message}`);
    }

    if (!business) {
      throw new Error("No business found for this user");
    }

    const businessId = business.id;
    logStep("Business found", { businessId });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No Stripe customer found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get ALL subscriptions (all statuses) to detect cancellations
    logStep("Fetching all subscriptions");
    const allSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
    });

    // Filter for active or trialing subscriptions
    const activeSubscriptions = allSubscriptions.data.filter(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    if (activeSubscriptions.length === 0) {
      logStep("No active subscriptions found - updating to canceled");
      
      // Update existing subscription to canceled status
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);

      if (updateError) {
        logStep("Warning: Could not update subscription to canceled", { error: updateError.message });
      } else {
        logStep("Subscription updated to canceled");
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "No active subscriptions - status updated to canceled" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found active subscriptions", {
      totalSubscriptions: activeSubscriptions.length,
      subscriptionIds: activeSubscriptions.map((s: Stripe.Subscription) => s.id),
    });

    // Use the most recent subscription if multiple exist
    const subscription = activeSubscriptions.sort((a: Stripe.Subscription, b: Stripe.Subscription) => b.created - a.created)[0];
    
    logStep("Selected most recent subscription", { 
      subscriptionId: subscription.id,
      created: subscription.created,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    });

    // Get plan type - PRIORITIZE price_id over metadata (price_id is always current)
    let planType: "standard" | "professional" = "standard";
    
    // Log all subscription items and their prices
    logStep("Subscription items", {
      items: subscription.items.data.map((item: any) => ({
        id: item.id,
        price_id: item.price?.id,
        product: item.price?.product,
      }))
    });
    
    // First try to get plan from price_id (most reliable source)
    if (subscription.items.data[0]?.price?.id) {
      const priceId = subscription.items.data[0].price.id;
      const mappedPlan = PRICE_TO_PLAN[priceId];
      
      logStep("Attempting to map price_id to plan", { 
        priceId, 
        mappedPlan,
        availableMappings: Object.keys(PRICE_TO_PLAN)
      });
      
      if (mappedPlan) {
        planType = mappedPlan;
        logStep("Plan type from price_id (RELIABLE)", { planType, priceId });
      } else {
        logStep("WARNING: price_id not found in mapping", { 
          priceId,
          availablePriceIds: Object.keys(PRICE_TO_PLAN)
        });
        // Fallback to metadata if price_id mapping failed
        if (subscription.metadata?.plan_type) {
          planType = subscription.metadata.plan_type as "standard" | "professional";
          logStep("Plan type from metadata (fallback)", { planType });
        }
      }
    } else if (subscription.metadata?.plan_type) {
      // Only use metadata if price_id is not available
      planType = subscription.metadata.plan_type as "standard" | "professional";
      logStep("Plan type from metadata (no price_id available)", { planType });
    }

    // Helper function to safely convert timestamp to ISO string
    const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
      if (!timestamp) return null;
      try {
        return new Date(timestamp * 1000).toISOString();
      } catch (error) {
        logStep("Error converting timestamp", { timestamp, error });
        return null;
      }
    };

    // Ensure current_period_start and current_period_end are ALWAYS populated
    const currentPeriodStart = safeTimestampToISO(subscription.current_period_start) || new Date().toISOString();
    const currentPeriodEnd = safeTimestampToISO(subscription.current_period_end) || 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to +30 days

    // Prepare subscription data with guaranteed periods
    const subscriptionData = {
      business_id: businessId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_type: planType,
      status: subscription.status,
      trial_end_date: safeTimestampToISO(subscription.trial_end),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    };

    logStep("Prepared subscription data with guaranteed periods", subscriptionData);

    // Upsert subscription to database
    const { data: upsertData, error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "business_id"
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Error upserting subscription: ${upsertError.message}`);
    }

    logStep("Subscription synced successfully", { subscriptionId: upsertData?.id });

    // Update businesses.subscription_id
    if (upsertData?.id) {
      const { error: businessUpdateError } = await supabaseClient
        .from("businesses")
        .update({ subscription_id: upsertData.id })
        .eq("id", businessId);

      if (businessUpdateError) {
        logStep("Warning: Could not update businesses.subscription_id", { error: businessUpdateError.message });
      } else {
        logStep("Updated businesses.subscription_id", { subscriptionId: upsertData.id });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Subscription synced successfully",
      subscription: {
        plan_type: planType,
        status: subscription.status,
        current_period_end: subscriptionData.current_period_end,
        current_period_start: subscriptionData.current_period_start,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
