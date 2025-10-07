import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Award, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ClientLoyaltyCardProps {
  userId: string;
}

export function ClientLoyaltyCard({ userId }: ClientLoyaltyCardProps) {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyData();
  }, [userId]);

  const fetchLoyaltyData = async () => {
    // Buscar todos os programas ativos dos negócios onde o cliente tem agendamentos
    const { data: appointments } = await supabase
      .from("appointments")
      .select("business_id")
      .eq("client_id", userId)
      .eq("status", "completed");

    if (!appointments || appointments.length === 0) {
      setLoading(false);
      return;
    }

    const businessIds = Array.from(new Set(appointments.map(a => a.business_id)));

    const { data: loyaltyPrograms } = await supabase
      .from("loyalty_programs")
      .select(`
        *,
        businesses(name, logo_url)
      `)
      .in("business_id", businessIds)
      .eq("is_active", true);

    if (loyaltyPrograms) {
      // Buscar saldos do cliente
      const programsWithBalances = await Promise.all(
        loyaltyPrograms.map(async (program) => {
          const { data: balance } = await supabase
            .from("loyalty_balances")
            .select("*")
            .eq("business_id", program.business_id)
            .eq("client_id", userId)
            .single();

          return {
            ...program,
            balance: balance || { points: 0, visits: 0 }
          };
        })
      );

      setPrograms(programsWithBalances);
    }

    setLoading(false);
  };

  if (loading) {
    return null;
  }

  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Gift className="h-6 w-6" />
        Programas de Fidelidade
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programs.map((program) => {
          const isPoints = program.program_type === "pontos";
          const currentValue = isPoints ? program.balance.points : program.balance.visits;
          const targetValue = isPoints ? program.points_required : program.visits_required;
          const progress = targetValue ? (currentValue / targetValue) * 100 : 0;

          return (
            <Card key={program.id} className="relative overflow-hidden">
              {program.businesses?.logo_url && (
                <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                  <img 
                    src={program.businesses.logo_url} 
                    alt="" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  {program.businesses?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPoints ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Seus Pontos:</span>
                      <Badge className="text-lg">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {program.balance.points}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso:</span>
                        <span className="font-medium">
                          {program.balance.points} / {program.points_required}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    {program.reward_value && (
                      <p className="text-sm text-center text-muted-foreground">
                        Próxima recompensa: R$ {Number(program.reward_value).toFixed(2)} de desconto
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Suas Visitas:</span>
                      <Badge className="text-lg">
                        {program.balance.visits} / {program.visits_required}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      {program.visits_required - program.balance.visits > 0 
                        ? `Faltam ${program.visits_required - program.balance.visits} visita(s) para ganhar sua recompensa!`
                        : "Você já pode resgatar sua recompensa!"
                      }
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}