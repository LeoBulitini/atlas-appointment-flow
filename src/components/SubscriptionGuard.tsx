import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredPlan?: "standard" | "professional";
}

interface SubscriptionStatus {
  has_access: boolean;
  plan: "standard" | "professional" | null;
  status: string | null;
  days_remaining: number;
  message?: string;
}

const SubscriptionGuard = ({ children, requiredPlan }: SubscriptionGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const location = useLocation();

  useEffect(() => {
    checkSubscription();
  }, [location.pathname]);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) throw error;

      setSubscriptionStatus(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if trying to access professional-only features with standard plan
  const isModuleRestricted = requiredPlan === "professional" && subscriptionStatus?.plan === "standard";
  
  // Block access completely only to professional modules if user has standard plan
  if (isModuleRestricted) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Recurso Premium</h2>
            <p className="text-muted-foreground mb-6">
              Este módulo está disponível apenas no <strong>Plano Professional</strong>.
              Faça upgrade para ter acesso completo ao sistema.
            </p>
            <a 
              href="/business/subscription" 
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
            >
              Fazer Upgrade
            </a>
          </div>
        </div>
      </>
    );
  }

  // For dashboard and other pages, show content with overlay if no access
  const needsOverlay = !subscriptionStatus?.has_access && !isModuleRestricted;

  return (
    <>
      {/* Show content (will be behind overlay if needed) */}
      <div className={needsOverlay ? "blur-sm pointer-events-none" : ""}>
        {children}
      </div>
      
      {/* Overlay for subscription required */}
      {needsOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md">
          <div className="max-w-md w-full mx-4 bg-card rounded-lg shadow-2xl p-8 text-center border-2 border-primary animate-in fade-in zoom-in duration-300">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {subscriptionStatus?.status === "trialing" ? "Teste Gratuito Expirado" : "Assinatura Necessária"}
              </h2>
              <p className="text-muted-foreground text-lg mb-2">
                {subscriptionStatus?.message || "Para continuar gerenciando sua empresa com todos os recursos do ATLAS, escolha um de nossos planos."}
              </p>
              <p className="text-sm text-muted-foreground/70">
                ✓ 14 dias de teste grátis • ✓ Cancele quando quiser
              </p>
            </div>
            <a 
              href="/business/subscription" 
              className="inline-block w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-8 py-4 rounded-lg hover:shadow-lg transition-all font-bold text-lg"
            >
              Ver Planos e Começar Agora
            </a>
            <p className="text-xs text-muted-foreground mt-4">
              Seus agendamentos continuam ativos mesmo sem assinatura
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SubscriptionGuard;
