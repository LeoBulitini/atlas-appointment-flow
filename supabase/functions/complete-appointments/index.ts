import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { toZonedTime, formatInTimeZone } from 'https://esm.sh/date-fns-tz@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BRAZIL_TZ = 'America/Sao_Paulo';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const now = toZonedTime(new Date(), BRAZIL_TZ);
    console.log('Starting complete-appointments function at:', formatInTimeZone(now, BRAZIL_TZ, 'yyyy-MM-dd HH:mm:ss'));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the function to complete past appointments
    console.log('Calling complete_past_appointments RPC...')
    const { data, error } = await supabase.rpc('complete_past_appointments')

    if (error) {
      console.error('Error completing appointments:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully completed past appointments. Result:', data)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Appointments completed successfully',
        timestamp: formatInTimeZone(now, BRAZIL_TZ, 'yyyy-MM-dd HH:mm:ss')
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in complete-appointments function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
