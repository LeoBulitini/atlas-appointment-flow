import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LoyaltyConfig } from "@/components/LoyaltyConfig";
import { LoyaltyBalances } from "@/components/LoyaltyBalances";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BusinessLoyalty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (business) {
      setBusinessId(business.id);
      setLoading(false);
    }
  };

  const handleConfigSaved = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Sucesso",
      description: "Configurações do programa de fidelidade salvas",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard/business")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Programa de Fidelidade</h1>
          <div className="w-24" />
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="balances">Saldos dos Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <LoyaltyConfig 
              businessId={businessId}
              onSave={handleConfigSaved}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="balances">
            <LoyaltyBalances businessId={businessId} refreshKey={refreshKey} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BusinessLoyalty;