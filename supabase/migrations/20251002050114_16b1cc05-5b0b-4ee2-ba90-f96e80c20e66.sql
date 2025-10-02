-- Create business_portfolio table for images/videos
CREATE TABLE public.business_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_data TEXT NOT NULL, -- Base64 encoded data
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business_clients table to track clients per business
CREATE TABLE public.business_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_appointment_date TIMESTAMP WITH TIME ZONE,
  last_appointment_date TIMESTAMP WITH TIME ZONE,
  total_appointments INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, client_id)
);

-- Create appointment_services junction table for multiple services per appointment
CREATE TABLE public.appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(appointment_id, service_id)
);

-- Add end_time to appointments to control slot blocking
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE;

-- Add indexes for performance
CREATE INDEX idx_business_portfolio_business ON public.business_portfolio(business_id);
CREATE INDEX idx_business_clients_business ON public.business_clients(business_id);
CREATE INDEX idx_business_clients_client ON public.business_clients(client_id);
CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON public.appointment_services(service_id);
CREATE INDEX idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_business_date ON public.appointments(business_id, appointment_date);

-- Enable RLS on new tables
ALTER TABLE public.business_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_portfolio
CREATE POLICY "Anyone can view portfolio of active businesses"
ON public.business_portfolio FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_portfolio.business_id
    AND (businesses.is_active = true OR businesses.owner_id = auth.uid())
  )
);

CREATE POLICY "Business owners can manage their portfolio"
ON public.business_portfolio FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_portfolio.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS Policies for business_clients
CREATE POLICY "Business owners can view their clients"
ON public.business_clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_clients.business_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "System can manage business_clients"
ON public.business_clients FOR ALL
USING (true);

-- RLS Policies for appointment_services
CREATE POLICY "Anyone can view appointment services"
ON public.appointment_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_services.appointment_id
    AND (
      appointments.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE businesses.id = appointments.business_id
        AND businesses.owner_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Clients can create appointment services"
ON public.appointment_services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_services.appointment_id
    AND appointments.client_id = auth.uid()
  )
);

-- Function to update business_clients when appointment is created
CREATE OR REPLACE FUNCTION public.update_business_clients()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.business_clients (business_id, client_id, first_appointment_date, last_appointment_date, total_appointments)
  VALUES (NEW.business_id, NEW.client_id, NEW.created_at, NEW.created_at, 1)
  ON CONFLICT (business_id, client_id)
  DO UPDATE SET
    last_appointment_date = NEW.created_at,
    total_appointments = business_clients.total_appointments + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update business_clients
CREATE TRIGGER update_business_clients_trigger
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_business_clients();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_portfolio;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_services;