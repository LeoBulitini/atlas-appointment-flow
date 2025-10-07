import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BusinessSubscription = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
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
    "Relatórios financeiros básicos",
    "Configurações de horários",
  ];

  const standardExcluded = [
    "Módulo de Estoque",
    "Módulo de Marketing",
    "Módulo de Fidelidade",
  ];

  const professionalFeatures = [
    "Tudo do Plano Standard",
    "Módulo de Estoque completo",
    "Módulo de Marketing com campanhas",
    "Programa de Fidelidade",
    "Relatórios avançados",
    "Analytics detalhado",
    "Suporte prioritário",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
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
                  "Assinar Plano"
                )}
              </Button>
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
                    Assinar Plano
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-4">
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
