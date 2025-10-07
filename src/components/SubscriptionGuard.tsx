import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) throw error;

      setSubscriptionStatus(data);

      // Check if access is blocked
      if (!data.has_access) {
        setShowBlockedDialog(true);
      } else if (requiredPlan === "professional" && data.plan === "standard") {
        // Standard plan trying to access professional features
        setShowBlockedDialog(true);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSubscription = () => {
    navigate("/business/subscription");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showBlockedDialog) {
    const isModuleRestricted = requiredPlan === "professional" && subscriptionStatus?.plan === "standard";
    
    return (
      <>
        <div className="relative">
          <div className="blur-sm pointer-events-none">{children}</div>
          <div className="absolute inset-0 bg-background/50" />
        </div>
        <AlertDialog open={showBlockedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isModuleRestricted ? "Recurso Premium" : "Assinatura Necessária"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isModuleRestricted ? (
                  <>
                    Este módulo está disponível apenas no <strong>Plano Professional</strong>.
                    Faça upgrade para ter acesso completo ao sistema.
                  </>
                ) : (
                  <>
                    {subscriptionStatus?.message || "Seu período de teste expirou ou você não possui uma assinatura ativa."}{" "}
                    Assine agora para continuar usando o ATLAS!
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button onClick={handleGoToSubscription}>
                {isModuleRestricted ? "Fazer Upgrade" : "Ver Planos"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGuard;
