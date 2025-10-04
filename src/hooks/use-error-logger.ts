import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useErrorLogger = () => {
  const logError = useCallback(async (error: Error, context?: any) => {
    try {
      await supabase.functions.invoke("log-error", {
        body: {
          error_message: error.message,
          error_stack: error.stack,
          error_context: context,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      });
    } catch (logError) {
      // Silenciosamente falhar - não queremos interromper a aplicação
      console.error("Falha ao registrar erro:", logError);
    }
  }, []);

  return { logError };
};
