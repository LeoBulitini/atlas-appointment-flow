import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { maskPhoneInput, validatePhoneNumber } from "@/lib/phone-utils";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"client" | "business">("client");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Verificar se já tem perfil completo
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile && profile.full_name && profile.phone && profile.birth_date) {
      // Perfil já completo, redirecionar
      navigate("/");
    }

    // Pré-preencher com dados do Google se disponíveis
    if (user.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phone)) {
      toast({
        variant: "destructive",
        title: "Número inválido",
        description: "Por favor, insira um número de celular válido",
      });
      return;
    }

    // Validar idade mínima
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    const dayDiff = today.getDate() - birthDateObj.getDate();
    const actualAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;

    if (actualAge < 11) {
      toast({
        variant: "destructive",
        title: "Idade insuficiente",
        description: "Você precisa ter no mínimo 11 anos para se cadastrar",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Atualizar perfil
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          birth_date: birthDate,
          user_type: userType,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil completo!",
        description: "Seu cadastro foi finalizado com sucesso",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao completar perfil",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhoneInput(e.target.value);
    setPhone(masked);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete seu Perfil</CardTitle>
          <CardDescription>
            Para continuar, precisamos de algumas informações adicionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Nome Completo</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth-date">Data de Nascimento</Label>
              <Input
                id="birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                min="1900-01-01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+55 (11) 98765-4321"
                value={phone}
                onChange={handlePhoneChange}
                required
                maxLength={19}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <RadioGroup value={userType} onValueChange={(value: any) => setUserType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="font-normal cursor-pointer">
                    Cliente - Agendar serviços
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="font-normal cursor-pointer">
                    Empresa - Oferecer serviços
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Completar Cadastro"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
