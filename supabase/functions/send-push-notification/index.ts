import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: any;
  notificationType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data, notificationType }: PushNotificationRequest = await req.json();
    
    console.log(`[Push] Sending to user ${userId}: ${title}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar preferências do usuário
    const { data: preferences } = await supabase
      .from('push_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Verificar se o tipo de notificação está habilitado
    if (preferences && preferences[notificationType] === false) {
      console.log(`[Push] User has disabled ${notificationType}`);
      return new Response(
        JSON.stringify({ success: true, message: 'User disabled this notification type' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar subscriptions ativas do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for user ${userId}`);
      return new Response(
        JSON.stringify({ success: false, error: 'No active subscriptions' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar payload da notificação
    const payload = JSON.stringify({
      title,
      body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: {
        ...data,
        timestamp: Date.now()
      }
    });

    // Enviar para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = sub.subscription;
          
          // Usar web-push para enviar
          await sendWebPush(subscription, payload);
          
          // Log de sucesso
          await supabase.from('push_notification_logs').insert({
            user_id: userId,
            notification_type: notificationType,
            title,
            body,
            data,
            success: true
          });

          return { success: true, subscription: sub.id };
        } catch (error: any) {
          console.error(`[Push] Error sending to subscription ${sub.id}:`, error);
          
          // Se a subscription expirou (410), marcar como inativa
          if (error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          // Log de erro
          await supabase.from('push_notification_logs').insert({
            user_id: userId,
            notification_type: notificationType,
            title,
            body,
            data: { error: error.message },
            success: false
          });

          return { success: false, subscription: sub.id, error: error.message };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;

    console.log(`[Push] Sent to ${successCount}/${subscriptions.length} subscriptions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: subscriptions.length,
        results 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Push] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

// Função auxiliar para enviar Web Push
async function sendWebPush(subscription: any, payload: string) {
  const webpush = await import("https://esm.sh/web-push@3.6.6");
  
  webpush.setVapidDetails(
    'mailto:contato@atlasbook.com.br',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  return await webpush.sendNotification(subscription, payload);
}

serve(handler);
