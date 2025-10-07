import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface StockMovementFormProps {
  businessId: string;
  productId: string;
  onSuccess: () => void;
}

export function StockMovementForm({ businessId, productId, onSuccess }: StockMovementFormProps) {
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [type, setType] = useState<"entrada" | "saida">("entrada");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [movementDate, setMovementDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (data) {
      setProduct(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("stock_movements")
        .insert({
          business_id: businessId,
          product_id: productId,
          type,
          quantity: parseInt(quantity),
          reason: reason || null,
          notes: notes || null,
          movement_date: movementDate,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error adding movement:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar a movimentação",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <p className="font-semibold">{product.name}</p>
        <p className="text-sm text-muted-foreground">
          Estoque atual: {product.current_quantity} {product.unit}
        </p>
      </div>

      <div>
        <Label>Tipo *</Label>
        <Select value={type} onValueChange={(value: any) => setType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Quantidade *</Label>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Motivo</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Compra, Venda, Uso interno"
        />
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <Label>Data *</Label>
        <Input
          type="date"
          value={movementDate}
          onChange={(e) => setMovementDate(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando..." : "Registrar Movimentação"}
      </Button>
    </form>
  );
}