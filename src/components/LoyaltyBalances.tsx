import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, TrendingUp } from "lucide-react";

interface LoyaltyBalancesProps {
  businessId: string;
  refreshKey: number;
}

export function LoyaltyBalances({ businessId, refreshKey }: LoyaltyBalancesProps) {
  const { toast } = useToast();
  const [balances, setBalances] = useState<any[]>([]);
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<any>(null);
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, [businessId, refreshKey]);

  const fetchData = async () => {
    const { data: programData } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (programData) {
      setProgram(programData);

      // Buscar todos os clientes do negócio
      const { data: clientsData } = await supabase
        .from("business_clients")
        .select(`
          client_id,
          profiles:client_id(full_name, phone)
        `)
        .eq("business_id", businessId);

      if (clientsData) {
        // Buscar saldos de fidelidade existentes
        const { data: balancesData } = await supabase
          .from("loyalty_balances")
          .select("*")
          .eq("business_id", businessId);

        // Criar mapa de saldos por client_id
        const balancesMap = new Map(
          balancesData?.map(b => [b.client_id, b]) || []
        );

        // Combinar clientes com seus saldos (ou criar registro com 0)
        const allBalances = clientsData.map(client => {
          const existingBalance = balancesMap.get(client.client_id);
          return existingBalance || {
            id: null,
            client_id: client.client_id,
            business_id: businessId,
            points: 0,
            visits: 0,
            profiles: client.profiles
          };
        });

        // Ordenar por pontos/visitas
        const sortField = programData.program_type === "pontos" ? "points" : "visits";
        allBalances.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
        
        setBalances(allBalances);
      }
    }
    setLoading(false);
  };

  const handleAdjustment = async () => {
    if (!adjustValue || !selectedBalance) return;

    try {
      const value = parseInt(adjustValue);
      const field = program.program_type === "pontos" ? "points" : "visits";
      const newValue = (selectedBalance[field] || 0) + value;

      // Se o cliente não tem registro ainda, criar um novo
      if (!selectedBalance.id) {
        const { error: insertError } = await supabase
          .from("loyalty_balances")
          .insert({
            business_id: businessId,
            client_id: selectedBalance.client_id,
            [field]: Math.max(0, newValue), // Não permitir valores negativos
          });

        if (insertError) throw insertError;
      } else {
        // Atualizar registro existente
        const { error: updateError } = await supabase
          .from("loyalty_balances")
          .update({ [field]: Math.max(0, newValue) })
          .eq("id", selectedBalance.id);

        if (updateError) throw updateError;
      }

      const { error: transactionError } = await supabase
        .from("loyalty_transactions")
        .insert({
          business_id: businessId,
          client_id: selectedBalance.client_id,
          type: "ajuste",
          [field === "points" ? "points_change" : "visits_change"]: value,
          description: adjustDescription || "Ajuste manual",
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Sucesso",
        description: "Saldo ajustado com sucesso",
      });

      setAdjustDialog(false);
      setAdjustValue("");
      setAdjustDescription("");
      fetchData();
    } catch (error: any) {
      console.error("Error adjusting balance:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível ajustar o saldo",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!program) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Configure o programa de fidelidade primeiro
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center">
              <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum cliente no programa ainda
              </p>
            </CardContent>
          </Card>
        ) : (
          balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {balance.profiles?.full_name || "Cliente"}
                </CardTitle>
                {balance.profiles?.phone && (
                  <p className="text-sm text-muted-foreground">
                    {balance.profiles.phone}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {program.program_type === "pontos" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pontos:</span>
                    <Badge>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {balance.points}
                    </Badge>
                  </div>
                )}

                {program.program_type === "visitas" && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Visitas:</span>
                    <Badge>
                      {balance.visits} / {program.visits_required}
                    </Badge>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedBalance(balance);
                    setAdjustDialog(true);
                  }}
                >
                  Ajustar Saldo
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <p className="text-sm">{selectedBalance?.profiles?.full_name}</p>
            </div>

            <div>
              <Label>Saldo Atual</Label>
              <p className="text-sm">
                {program?.program_type === "pontos" 
                  ? `${selectedBalance?.points} pontos`
                  : `${selectedBalance?.visits} visitas`
                }
              </p>
            </div>

            <div>
              <Label>
                Ajuste (use + ou - para adicionar/remover)
              </Label>
              <Input
                type="number"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                placeholder="Ex: +10 ou -5"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                placeholder="Motivo do ajuste"
              />
            </div>

            <Button onClick={handleAdjustment} className="w-full">
              Confirmar Ajuste
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}