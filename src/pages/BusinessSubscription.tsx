import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles, Settings, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatus {
  has_access: boolean;
  plan: "standard" | "professional" | null;
  status: string | null;
  days_remaining: number;
}

const BusinessSubscription = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentSubscription();
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      console.log("Subscription status:", data);
      setSubscriptionStatus(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível abrir o portal de gerenciamento.",
      });
    }
  };

  const handleSyncSubscription = async () => {
    try {
      setSyncing(true);
      const { data, error } = await supabase.functions.invoke("sync-stripe-subscription");

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso!",
          description: "Assinatura sincronizada com sucesso. Atualizando página...",
        });
        
        // Redirecionar para o dashboard após 2 segundos
        setTimeout(() => {
          navigate("/dashboard/business");
        }, 2000);
      } else {
        toast({
          title: "Aviso",
          description: data?.message || "Nenhuma assinatura ativa encontrada",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error syncing subscription:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar assinatura",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSubscribe = async (planType: "standard" | "professional") => {
    try {
      setLoading(planType);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para assinar um plano",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planType },
      });

      if (error) {
        console.error("Error from create-checkout:", error);
        throw error;
      }

      console.log("Checkout data received:", data);

      if (data?.url) {
        console.log("Checkout URL:", data.url);
        
        // Sempre abrir em nova aba
        window.open(data.url, '_blank');
        toast({
          title: "Checkout Aberto em Nova Aba",
          description: "Complete o pagamento na aba aberta. Após concluir, clique em 'Sincronizar Assinatura' abaixo para ativar seu plano.",
          duration: 8000,
        });

        // Tentar sincronizar após 5 segundos
        setTimeout(async () => {
          try {
            await supabase.functions.invoke("sync-stripe-subscription");
          } catch (error) {
            console.error("Error syncing subscription:", error);
          }
        }, 5000);
      } else {
        throw new Error("URL de checkout não foi retornada");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar sessão de pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const standardFeatures = [
    "Dashboard completo",
    "Gerenciamento de agendamentos",
    "Gerenciamento de clientes",
    "Calendário de agendamentos",
    "Avaliações e reviews",
    "Gestão de serviços",
    "Relatórios básicos",
    "Configurações de horários",
  ];

  const standardExcluded = [
    "Módulo de Estoque",
    "Módulo de Marketing",
    "Módulo de Fidelidade",
    "Módulo Financeiro",
  ];

  const professionalFeatures = [
    "Tudo do Plano Standard",
    "Módulo de Estoque completo",
    "Módulo de Marketing com campanhas",
    "Programa de Fidelidade",
    "Módulo Financeiro completo",
    "Analytics detalhado",
    "Suporte prioritário",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/business")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu Plano ATLAS</h1>
          <p className="text-xl text-muted-foreground">
            Gerencie sua empresa de forma profissional
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Standard Plan */}
          <Card className="relative hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">Plano Standard</CardTitle>
              <CardDescription>Para empresas em crescimento</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 29,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="font-medium text-sm text-muted-foreground">Incluído:</p>
                {standardFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <p className="font-medium text-sm text-muted-foreground">Não incluído:</p>
                {standardExcluded.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2 opacity-60">
                    <span className="text-sm">✗ {feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {subscriptionStatus?.has_access && subscriptionStatus?.plan === "standard" && subscriptionStatus?.status === "active" ? (
                  <Badge className="w-full py-2 justify-center" variant="secondary">
                    Plano Atual
                  </Badge>
                ) : subscriptionStatus?.has_access && subscriptionStatus?.plan === "professional" ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full"
                  >
                    Você tem Professional
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSubscribe("standard")}
                    disabled={loading !== null}
                  >
                    {loading === "standard" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Assinar Agora"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="relative border-primary shadow-xl hover:shadow-2xl transition-shadow">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Mais Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Plano Professional</CardTitle>
              <CardDescription>Recursos completos para sua empresa</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 59,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="font-medium text-sm text-muted-foreground">Tudo incluído:</p>
                {professionalFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {subscriptionStatus?.has_access && subscriptionStatus?.plan === "professional" && subscriptionStatus?.status === "active" ? (
                  <Badge className="w-full py-2 justify-center" variant="secondary">
                    Plano Atual
                  </Badge>
                ) : subscriptionStatus?.has_access && subscriptionStatus?.plan === "standard" && subscriptionStatus?.status === "active" ? (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                    onClick={handleUpgrade}
                    disabled={loadingPortal}
                  >
                    {loadingPortal ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Abrindo...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Fazer Upgrade
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                    onClick={() => handleSubscribe("professional")}
                    disabled={loading !== null}
                  >
                    {loading === "professional" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Assinar Agora
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleSyncSubscription}
            disabled={syncing}
            className="mb-4"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              "Sincronizar Assinatura"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Já completou o pagamento? Clique no botão acima para sincronizar sua assinatura.
          </p>
          <p className="text-sm text-muted-foreground">
            Cancele a qualquer momento, sem taxas de cancelamento.
          </p>
          <p className="text-sm text-muted-foreground">
            Pagamento seguro processado pelo Stripe. Seus dados estão protegidos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessSubscription;
