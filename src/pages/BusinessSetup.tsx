import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [existingBusiness, setExistingBusiness] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    phone: "",
    email: "",
    price_range: "$$",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    checkExistingBusiness();
  }, []);

  const checkExistingBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingBusiness(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          category: data.category || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
          phone: data.phone || "",
          email: data.email || "",
          price_range: data.price_range || "$$",
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
        });
      }
    } catch (error: any) {
      console.error("Error checking business:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        return;
      }

      const businessData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        owner_id: user.id,
      };

      if (existingBusiness) {
        const { error } = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", existingBusiness.id);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Empresa atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("businesses")
          .insert(businessData);

        if (error) throw error;

        toast({
          title: "Sucesso!",
          description: "Empresa cadastrada com sucesso",
        });
      }

      navigate("/dashboard/business");
    } catch (error: any) {
      console.error("Error saving business:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar empresa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {existingBusiness ? "Editar Empresa" : "Cadastrar Empresa"}
            </CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para começar a receber agendamentos
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Bella Vista Salon"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange("category", value)}
                    required
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salão de Beleza">Salão de Beleza</SelectItem>
                      <SelectItem value="Barbearia">Barbearia</SelectItem>
                      <SelectItem value="Spa & Massagem">Spa & Massagem</SelectItem>
                      <SelectItem value="Estética & Unhas">Estética & Unhas</SelectItem>
                      <SelectItem value="Maquiagem">Maquiagem</SelectItem>
                      <SelectItem value="Tatuagem">Tatuagem</SelectItem>
                      <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                      <SelectItem value="Psicologia">Psicologia</SelectItem>
                      <SelectItem value="Estúdio de Tatuagem">Estúdio de Tatuagem</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Descreva sua empresa e serviços..."
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço *</Label>
                <Input
                  id="address"
                  required
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Av. Paulista, 1234"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    required
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">CEP</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleChange("postal_code", e.target.value)}
                    placeholder="01310-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_range">Faixa de Preço</Label>
                <Select
                  value={formData.price_range}
                  onValueChange={(value) => handleChange("price_range", value)}
                >
                  <SelectTrigger id="price_range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ - Econômico</SelectItem>
                    <SelectItem value="$$">$$ - Moderado</SelectItem>
                    <SelectItem value="$$$">$$$ - Alto</SelectItem>
                    <SelectItem value="$$$$">$$$$ - Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude (opcional)</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange("latitude", e.target.value)}
                    placeholder="-23.5505"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para aparecer em buscas por proximidade
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude (opcional)</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange("longitude", e.target.value)}
                    placeholder="-46.6333"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use Google Maps para obter coordenadas
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  existingBusiness ? "Atualizar Empresa" : "Cadastrar Empresa"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessSetup;
