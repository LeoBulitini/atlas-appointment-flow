-- Allow clients to delete appointment services from their own appointments
-- This is needed for rescheduling functionality where clients can change services
CREATE POLICY "Clients can delete their appointment services"
ON appointment_services
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM appointments
    WHERE appointments.id = appointment_services.appointment_id
      AND appointments.client_id = auth.uid()
      AND appointments.status IN ('pending', 'confirmed')
  )
);