import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";
import { ProductsList } from "@/components/ProductsList";
import { StockMovementForm } from "@/components/StockMovementForm";
import { StockHistory } from "@/components/StockHistory";
import { StockReports } from "@/components/StockReports";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BusinessStock = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (businessId) {
      checkLowStock();
    }
  }, [businessId, refreshKey]);

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

  const checkLowStock = async () => {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .filter("current_quantity", "lte", "minimum_quantity");

    setLowStockCount(data?.length || 0);
  };

  const handleSuccess = () => {
    setShowProductForm(false);
    setShowMovementForm(false);
    setSelectedProduct(null);
    setEditingProduct(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowProductForm(true);
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
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard/business")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Estoque</h1>
            <Button onClick={() => setShowProductForm(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        {lowStockCount > 0 && (
          <Card className="mb-6 border-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">
                  {lowStockCount} produto(s) com estoque baixo
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsList 
              businessId={businessId}
              refreshKey={refreshKey}
              onAddMovement={(productId) => {
                setSelectedProduct(productId);
                setShowMovementForm(true);
              }}
              onEditProduct={handleEditProduct}
            />
          </TabsContent>

          <TabsContent value="history">
            <StockHistory businessId={businessId} refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="reports">
            <StockReports businessId={businessId} />
          </TabsContent>
        </Tabs>

        <Dialog open={showProductForm} onOpenChange={(open) => {
          setShowProductForm(open);
          if (!open) setEditingProduct(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <ProductForm 
              businessId={businessId} 
              product={editingProduct}
              onSuccess={handleSuccess} 
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <StockMovementForm 
                businessId={businessId}
                productId={selectedProduct}
                onSuccess={handleSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BusinessStock;