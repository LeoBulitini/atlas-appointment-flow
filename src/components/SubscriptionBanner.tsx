import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface SubscriptionStatus {
  has_access: boolean;
  plan: "standard" | "professional" | null;
  status: string | null;
  days_remaining: number;
  trial_end_date?: string;
  current_period_end?: string;
}

const SubscriptionBanner = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !subscriptionStatus) return null;

  const { status, plan, days_remaining, has_access } = subscriptionStatus;

  // Don't show banner if no access (overlay will show instead)
  if (!has_access) return null;

  // Don't show banner if everything is fine
  if (status === "active" && days_remaining > 7) return null;

  const getPlanLabel = (plan: string) => {
    return plan === "standard" ? "Standard" : "Professional";
  };

  // Trial ending soon
  if (status === "trialing" && days_remaining <= 7) {
    return (
      <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          Seu teste grátis termina em {days_remaining} {days_remaining === 1 ? "dia" : "dias"}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-800 dark:text-amber-200">
            Assine agora para não perder o acesso ao seu dashboard.
          </span>
          <Button
            size="sm"
            onClick={() => navigate("/business/subscription")}
            className="ml-4"
          >
            Assinar Agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Active subscription ending soon
  if (status === "active" && days_remaining <= 7) {
    return (
      <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
          Plano {plan && getPlanLabel(plan)} Ativo
          <Badge variant="secondary">{days_remaining} {days_remaining === 1 ? "dia" : "dias"} restantes</Badge>
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Sua próxima cobrança será processada automaticamente.
        </AlertDescription>
      </Alert>
    );
  }

  // Past due or canceled
  if (status === "past_due" || status === "canceled") {
    return (
      <Alert className="mb-6 border-red-500 bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-900 dark:text-red-100">
          {status === "past_due" ? "Pagamento Pendente" : "Assinatura Cancelada"}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span className="text-red-800 dark:text-red-200">
            {status === "past_due"
              ? "Atualize sua forma de pagamento para restaurar o acesso completo."
              : "Sua assinatura foi cancelada. Reative para continuar usando todos os recursos."}
          </span>
          <Button
            size="sm"
            onClick={() => navigate("/business/subscription")}
            className="ml-4"
          >
            {status === "past_due" ? "Atualizar Pagamento" : "Reativar"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default SubscriptionBanner;
