-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- Create enum for plan type
CREATE TYPE plan_type AS ENUM ('standard', 'professional');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type plan_type NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_end_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view their own subscription
CREATE POLICY "Business owners can view their subscription"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = subscriptions.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Policy: System can manage all subscriptions (for edge functions)
CREATE POLICY "System can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add subscription_id to businesses table
ALTER TABLE public.businesses
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id);

-- Create trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check subscription access
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_has_access BOOLEAN;
  v_days_remaining INTEGER;
BEGIN
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'plan', null,
      'status', null,
      'days_remaining', 0,
      'message', 'Nenhuma assinatura encontrada'
    );
  END IF;
  
  -- Check if has access (trialing or active)
  v_has_access := v_subscription.status IN ('trialing', 'active');
  
  -- Calculate days remaining
  IF v_subscription.status = 'trialing' AND v_subscription.trial_end_date IS NOT NULL THEN
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_subscription.trial_end_date - NOW())));
  ELSIF v_subscription.status = 'active' AND v_subscription.current_period_end IS NOT NULL THEN
    v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_subscription.current_period_end - NOW())));
  ELSE
    v_days_remaining := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'has_access', v_has_access,
    'plan', v_subscription.plan_type,
    'status', v_subscription.status,
    'days_remaining', v_days_remaining,
    'trial_end_date', v_subscription.trial_end_date,
    'current_period_end', v_subscription.current_period_end
  );
END;
$$;