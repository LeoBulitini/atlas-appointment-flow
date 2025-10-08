import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, Plus, ShoppingCart, Pencil } from "lucide-react";
import { SellProductDialog } from "./SellProductDialog";

interface ProductsListProps {
  businessId: string;
  refreshKey: number;
  onAddMovement: (productId: string) => void;
  onEditProduct: (product: any) => void;
}

export function ProductsList({ businessId, refreshKey, onAddMovement, onEditProduct }: ProductsListProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [businessId, refreshKey]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSellClick = (product: any) => {
    setSelectedProduct(product);
    setSellDialogOpen(true);
  };

  const handleSellSuccess = () => {
    fetchProducts();
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        products.map((product) => {
          const isLowStock = product.current_quantity <= product.minimum_quantity;
          
          return (
            <Card key={product.id} className={isLowStock ? "border-yellow-500" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    )}
                  </div>
                  {isLowStock && (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <Badge variant={isLowStock ? "destructive" : "default"}>
                    {product.current_quantity} {product.unit}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mínimo:</span>
                  <span className="text-sm">{product.minimum_quantity} {product.unit}</span>
                </div>

                {product.cost_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Custo:</span>
                    <span className="text-sm">R$ {Number(product.cost_price).toFixed(2)}</span>
                  </div>
                )}

                {product.selling_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Venda:</span>
                    <span className="text-sm font-semibold">R$ {Number(product.selling_price).toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onAddMovement(product.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Movimentar
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditProduct(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {product.selling_price && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleSellClick(product)}
                      disabled={product.current_quantity <= 0}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Vender
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
      </div>

      {selectedProduct && (
        <SellProductDialog
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
          product={selectedProduct}
          businessId={businessId}
          onSuccess={handleSellSuccess}
        />
      )}
    </>
  );
}