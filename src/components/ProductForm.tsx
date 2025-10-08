import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProductFormProps {
  businessId: string;
  onSuccess: () => void;
}

export function ProductForm({ businessId, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          name,
          brand: brand || null,
          unit,
          cost_price: costPrice ? parseFloat(costPrice) : null,
          selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
          minimum_quantity: minimumQuantity ? parseInt(minimumQuantity) : 0,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível cadastrar o produto",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nome do Produto *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Marca</Label>
        <Input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>

      <div>
        <Label>Unidade *</Label>
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Ex: unidade, kg, litro, caixa"
          required
        />
      </div>

      <div>
        <Label>Preço de Custo (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
        />
      </div>

      <div>
        <Label>Preço de Venda (R$)</Label>
        <Input
          type="number"
          step="0.01"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
        />
      </div>

      <div>
        <Label>Estoque Mínimo</Label>
        <Input
          type="number"
          value={minimumQuantity}
          onChange={(e) => setMinimumQuantity(e.target.value)}
          placeholder="0"
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando..." : "Cadastrar Produto"}
      </Button>
    </form>
  );
}