-- Update check_subscription_access function to properly handle canceled status
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_business_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Check if has access (only trialing or active, NOT canceled)
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
$function$;