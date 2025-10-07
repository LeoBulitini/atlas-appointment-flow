-- Drop the existing restrictive policy for clients updating appointments
DROP POLICY IF EXISTS "Clients can update their pending appointments" ON appointments;

-- Create new policy allowing clients to update their pending AND confirmed appointments
CREATE POLICY "Clients can update their appointments for rescheduling"
ON appointments
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() 
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  client_id = auth.uid() 
  AND status IN ('pending', 'confirmed')
);