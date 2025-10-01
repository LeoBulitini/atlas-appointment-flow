-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON public.appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON public.businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses(is_active);

CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON public.reviews(appointment_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);