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

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscriptions found");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No active subscriptions found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Get plan type from metadata, price, or default to standard
    let planType: "standard" | "professional" = "standard";
    
    if (subscription.metadata?.plan_type) {
      planType = subscription.metadata.plan_type as "standard" | "professional";
      logStep("Plan type from metadata", { planType });
    } else if (subscription.items.data[0]?.price?.id) {
      const priceId = subscription.items.data[0].price.id;
      planType = PRICE_TO_PLAN[priceId] || "standard";
      logStep("Plan type from price_id", { priceId, planType });
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

    // Prepare subscription data with null checks
    const subscriptionData = {
      business_id: businessId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_type: planType,
      status: subscription.status,
      trial_end_date: safeTimestampToISO(subscription.trial_end),
      current_period_start: safeTimestampToISO(subscription.current_period_start),
      current_period_end: safeTimestampToISO(subscription.current_period_end),
      updated_at: new Date().toISOString(),
    };

    logStep("Prepared subscription data", subscriptionData);

    // Upsert subscription to database
    const { error: upsertError } = await supabaseClient
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "business_id"
      });

    if (upsertError) {
      throw new Error(`Error upserting subscription: ${upsertError.message}`);
    }

    logStep("Subscription synced successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Subscription synced successfully",
      subscription: {
        plan_type: planType,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
