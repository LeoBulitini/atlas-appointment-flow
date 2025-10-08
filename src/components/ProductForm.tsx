import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(200, "Nome deve ter no máximo 200 caracteres"),
  brand: z.string().trim().max(100, "Marca deve ter no máximo 100 caracteres").optional(),
  unit: z.string().trim().min(1, "Unidade é obrigatória").max(50, "Unidade deve ter no máximo 50 caracteres"),
  cost_price: z.number().min(0, "Preço de custo deve ser maior ou igual a zero").optional(),
  selling_price: z.number().min(0, "Preço de venda deve ser maior ou igual a zero").optional(),
  minimum_quantity: z.number().int().min(0, "Estoque mínimo deve ser maior ou igual a zero"),
});

interface Product {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  cost_price: number | null;
  selling_price: number | null;
  minimum_quantity: number;
}

interface ProductFormProps {
  businessId: string;
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductForm({ businessId, product, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setBrand(product.brand || "");
      setUnit(product.unit);
      setCostPrice(product.cost_price ? product.cost_price.toString() : "");
      setSellingPrice(product.selling_price ? product.selling_price.toString() : "");
      setMinimumQuantity(product.minimum_quantity.toString());
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate input data
      const validatedData = productSchema.parse({
        name,
        brand: brand || undefined,
        unit,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        selling_price: sellingPrice ? parseFloat(sellingPrice) : undefined,
        minimum_quantity: minimumQuantity ? parseInt(minimumQuantity) : 0,
      });

      const productData = {
        business_id: businessId,
        name: validatedData.name,
        brand: validatedData.brand || null,
        unit: validatedData.unit,
        cost_price: validatedData.cost_price || null,
        selling_price: validatedData.selling_price || null,
        minimum_quantity: validatedData.minimum_quantity,
      };

      let error;
      if (product) {
        // Update existing product
        const result = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);
        error = result.error;
      } else {
        // Insert new product
        const result = await supabase
          .from("products")
          .insert(productData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: product ? "Produto atualizado com sucesso" : "Produto cadastrado com sucesso",
      });

      onSuccess();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Erro de validação",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.message || "Não foi possível salvar o produto",
        });
      }
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
        {submitting ? "Salvando..." : product ? "Atualizar Produto" : "Cadastrar Produto"}
      </Button>
    </form>
  );
}