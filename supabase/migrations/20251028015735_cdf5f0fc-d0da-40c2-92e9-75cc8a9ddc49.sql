-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job to run every minute (will replace if exists)
SELECT cron.schedule(
  'complete-past-appointments-job',
  '* * * * *',
  $$SELECT complete_past_appointments()$$
);