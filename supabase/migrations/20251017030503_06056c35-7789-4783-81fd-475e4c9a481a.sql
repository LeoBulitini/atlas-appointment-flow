-- Drop the existing policy that restricts status updates
DROP POLICY IF EXISTS "Clients can update their appointments for rescheduling" ON appointments;

-- Create a new policy that allows clients to cancel their appointments
CREATE POLICY "Clients can update their appointments for rescheduling"
ON appointments
FOR UPDATE
TO authenticated
USING (
  (client_id = auth.uid()) 
  AND (status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status]))
)
WITH CHECK (
  (client_id = auth.uid()) 
  AND (
    -- Allow rescheduling (keeping status as pending/confirmed)
    status = ANY (ARRAY['pending'::appointment_status, 'confirmed'::appointment_status])
    -- OR allow cancelling
    OR status = 'cancelled'::appointment_status
  )
);