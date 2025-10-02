-- Permitir donos de empresas deletarem serviços de agendamentos
CREATE POLICY "Business owners can delete appointment services"
ON appointment_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    JOIN businesses ON businesses.id = appointments.business_id
    WHERE appointments.id = appointment_services.appointment_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Permitir donos de empresas inserirem serviços de agendamentos
CREATE POLICY "Business owners can create appointment services"
ON appointment_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    JOIN businesses ON businesses.id = appointments.business_id
    WHERE appointments.id = appointment_services.appointment_id
    AND businesses.owner_id = auth.uid()
  )
);