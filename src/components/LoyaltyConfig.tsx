import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface LoyaltyConfigProps {
  businessId: string;
  onSave: () => void;
  refreshKey: number;
}

export function LoyaltyConfig({ businessId, onSave, refreshKey }: LoyaltyConfigProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [programId, setProgramId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [programType, setProgramType] = useState<"pontos" | "visitas">("pontos");
  
  // Pontos config
  const [pointsPerReal, setPointsPerReal] = useState("1");
  const [pointsRequired, setPointsRequired] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [allowPointsAccumulation, setAllowPointsAccumulation] = useState(true);
  
  // Visitas config
  const [visitsRequired, setVisitsRequired] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [qualifyingServices, setQualifyingServices] = useState<string[]>([]);
  const [rewardServices, setRewardServices] = useState<string[]>([]);
  
  // Validade
  const [pointsValidityDays, setPointsValidityDays] = useState("");

  useEffect(() => {
    fetchConfig();
    fetchServices();
  }, [businessId, refreshKey]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (data) {
      setServices(data);
    }
  };

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (data) {
      setProgramId(data.id);
      setIsActive(data.is_active);
      setProgramType(data.program_type as "pontos" | "visitas");
      setPointsPerReal(data.points_per_real?.toString() || "1");
      setPointsRequired(data.points_required?.toString() || "");
      setRewardValue(data.reward_value?.toString() || "");
      setVisitsRequired(data.visits_required?.toString() || "");
      setQualifyingServices(data.qualifying_services || []);
      setRewardServices(data.reward_services || []);
      setPointsValidityDays(data.points_validity_days?.toString() || "");
      setAllowPointsAccumulation(data.allow_points_accumulation ?? true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      const programData = {
        business_id: businessId,
        is_active: isActive,
        program_type: programType,
        points_per_real: programType === "pontos" ? parseFloat(pointsPerReal) : null,
        points_required: programType === "pontos" && pointsRequired ? parseInt(pointsRequired) : null,
        reward_value: programType === "pontos" && rewardValue ? parseFloat(rewardValue) : null,
        visits_required: programType === "visitas" && visitsRequired ? parseInt(visitsRequired) : null,
        qualifying_services: programType === "visitas" && qualifyingServices.length > 0 ? qualifyingServices : null,
        reward_services: programType === "visitas" && rewardServices.length > 0 ? rewardServices : null,
        points_validity_days: pointsValidityDays ? parseInt(pointsValidityDays) : null,
        allow_points_accumulation: allowPointsAccumulation,
      };

      if (programId) {
        const { error } = await supabase
          .from("loyalty_programs")
          .update(programData)
          .eq("id", programId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_programs")
          .insert(programData);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error("Error saving loyalty config:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível salvar as configurações",
      });
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Programa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Programa Ativo</Label>
            <p className="text-sm text-muted-foreground">
              Ative ou desative o programa de fidelidade
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div>
          <Label>Tipo de Programa</Label>
          <Select value={programType} onValueChange={(value) => setProgramType(value as "pontos" | "visitas")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pontos">Por Pontos</SelectItem>
              <SelectItem value="visitas">Por Visitas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {programType === "pontos" && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Configuração de Pontos</h3>
            
            <div>
              <Label>Pontos por Real Gasto</Label>
              <Input
                type="number"
                step="0.01"
                value={pointsPerReal}
                onChange={(e) => setPointsPerReal(e.target.value)}
              />
            </div>

            <div>
              <Label>Pontos Necessários para Recompensa</Label>
              <Input
                type="number"
                value={pointsRequired}
                onChange={(e) => setPointsRequired(e.target.value)}
              />
            </div>

            <div>
              <Label>Valor da Recompensa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={rewardValue}
                onChange={(e) => setRewardValue(e.target.value)}
              />
            </div>

            <div>
              <Label>Validade dos Pontos (dias - opcional)</Label>
              <Input
                type="number"
                value={pointsValidityDays}
                onChange={(e) => setPointsValidityDays(e.target.value)}
                placeholder="Deixe vazio para pontos sem validade"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label>Permitir Acúmulo de Pontos</Label>
                <p className="text-sm text-muted-foreground">
                  Se desativado, clientes não poderão acumular pontos além do necessário para resgate
                </p>
              </div>
              <Switch 
                checked={allowPointsAccumulation} 
                onCheckedChange={setAllowPointsAccumulation} 
              />
            </div>
          </div>
        )}

        {programType === "visitas" && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Configuração de Visitas</h3>
            
            <div>
              <Label>Visitas Necessárias para Recompensa</Label>
              <Input
                type="number"
                value={visitsRequired}
                onChange={(e) => setVisitsRequired(e.target.value)}
              />
            </div>

            <div>
              <Label>Serviços que Contam (deixe vazio para todos)</Label>
              <div className="space-y-2 mt-2">
                {services.map(service => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={qualifyingServices.includes(service.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setQualifyingServices([...qualifyingServices, service.id]);
                        } else {
                          setQualifyingServices(qualifyingServices.filter(id => id !== service.id));
                        }
                      }}
                    />
                    <label className="text-sm">{service.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Serviços de Recompensa</Label>
              <div className="space-y-2 mt-2">
                {services.map(service => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={rewardServices.includes(service.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRewardServices([...rewardServices, service.id]);
                        } else {
                          setRewardServices(rewardServices.filter(id => id !== service.id));
                        }
                      }}
                    />
                    <label className="text-sm">{service.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <Label>Permitir Acúmulo de Visitas</Label>
                <p className="text-sm text-muted-foreground">
                  Se desativado, clientes não poderão acumular visitas além do necessário para resgate
                </p>
              </div>
              <Switch 
                checked={allowPointsAccumulation} 
                onCheckedChange={setAllowPointsAccumulation} 
              />
            </div>
          </div>
        )}

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}