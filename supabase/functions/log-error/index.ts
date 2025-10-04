import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ErrorLogRequest {
  error_message: string;
  error_stack?: string;
  error_context?: any;
  page_url: string;
  user_agent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      error_message,
      error_stack,
      error_context,
      page_url,
      user_agent,
    }: ErrorLogRequest = await req.json();

    // Tentar obter usuário autenticado (opcional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Inserir log de erro no banco
    const { error: insertError } = await supabase.from("error_logs").insert({
      user_id: userId,
      error_message: error_message.substring(0, 5000), // Limitar tamanho
      error_stack: error_stack?.substring(0, 10000) || null,
      error_context: error_context || {},
      page_url: page_url.substring(0, 2000),
      user_agent: user_agent?.substring(0, 500) || null,
    });

    if (insertError) {
      console.error("Erro ao inserir log:", insertError);
      // Não retornar erro ao cliente para não interromper o fluxo
    } else {
      console.log("✅ Log de erro registrado:", error_message.substring(0, 100));
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao processar log:", error);
    // Retornar sucesso mesmo em erro para não interromper aplicação
    return new Response(
      JSON.stringify({ success: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
