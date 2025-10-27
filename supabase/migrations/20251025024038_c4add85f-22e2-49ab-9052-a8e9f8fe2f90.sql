-- Função para criar trial de 7 dias automaticamente
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar assinatura trial de 7 dias para novos negócios
  INSERT INTO public.subscriptions (
    business_id,
    plan_type,
    status,
    trial_end_date,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'standard',
    'trialing',
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar trial automaticamente quando um negócio é criado
DROP TRIGGER IF EXISTS trigger_create_trial_subscription ON public.businesses;
CREATE TRIGGER trigger_create_trial_subscription
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();