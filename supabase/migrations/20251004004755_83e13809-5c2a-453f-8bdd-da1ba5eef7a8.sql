-- 1. Adicionar formas de pagamento na tabela businesses
ALTER TABLE public.businesses 
ADD COLUMN payment_methods text[] DEFAULT ARRAY['debit', 'credit', 'cash', 'pix']::text[];

COMMENT ON COLUMN public.businesses.payment_methods IS 'Formas de pagamento aceitas: debit, credit, cash, pix';

-- 2. Adicionar flag de lembrete enviado na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN reminder_sent boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.appointments.reminder_sent IS 'Indica se o email de lembrete foi enviado';

CREATE INDEX idx_appointments_reminder ON public.appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status = 'confirmed' AND reminder_sent = false;

-- 3. Criar tabela para horários especiais de negócio
CREATE TABLE public.business_special_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_closed boolean DEFAULT false NOT NULL,
  open_time time without time zone,
  close_time time without time zone,
  breaks jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(business_id, date)
);

COMMENT ON TABLE public.business_special_hours IS 'Horários especiais ou fechamentos em datas específicas';

CREATE INDEX idx_special_hours_business_date ON public.business_special_hours(business_id, date);

ALTER TABLE public.business_special_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their special hours"
ON public.business_special_hours
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.businesses
  WHERE businesses.id = business_special_hours.business_id
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Anyone can view special hours of active businesses"
ON public.business_special_hours
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.businesses
  WHERE businesses.id = business_special_hours.business_id
  AND (businesses.is_active = true OR businesses.owner_id = auth.uid())
));

-- 4. Adicionar imagem nos serviços
ALTER TABLE public.services 
ADD COLUMN image_url text;

COMMENT ON COLUMN public.services.image_url IS 'URL da imagem do serviço (base64 ou URL externa)';

-- 5. Adicionar visibilidade pública nos serviços
ALTER TABLE public.services 
ADD COLUMN is_public boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN public.services.is_public IS 'Define se o serviço é visível para clientes no agendamento público';

CREATE INDEX idx_services_public_active ON public.services(business_id, is_active, is_public);

-- 6. Criar tabela de logs de erros
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  error_context jsonb DEFAULT '{}'::jsonb,
  page_url text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.error_logs IS 'Registro de erros do sistema para debugging';

CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user ON public.error_logs(user_id) WHERE user_id IS NOT NULL;

-- RLS: Apenas sistema pode inserir via function
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Nenhuma política de SELECT - logs são apenas para admin via SQL direto