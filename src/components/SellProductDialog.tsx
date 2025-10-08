import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

interface SellProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    selling_price: number;
    current_quantity: number;
    unit: string;
  };
  businessId: string;
  onSuccess: () => void;
}

export function SellProductDialog({
  open,
  onOpenChange,
  product,
  businessId,
  onSuccess,
}: SellProductDialogProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState("1");
  const [discountType, setDiscountType] = useState<"percent" | "value">("percent");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = (product.selling_price || 0) * (parseFloat(quantity) || 0);
  
  const discountAmount = discountType === "percent"
    ? (subtotal * (parseFloat(discount) || 0)) / 100
    : parseFloat(discount) || 0;
  
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (open) {
      setQuantity("1");
      setDiscount("0");
      setDiscountType("percent");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseFloat(quantity);
    if (qty <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade deve ser maior que zero",
      });
      return;
    }

    if (qty > product.current_quantity) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Quantidade indisponível em estoque",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Criar movimento de estoque (saída)
      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert({
          business_id: businessId,
          product_id: product.id,
          type: "saida",
          quantity: qty,
          movement_date: new Date().toISOString().split('T')[0],
          reason: "venda",
          notes: discountAmount > 0 
            ? `Venda com desconto de R$ ${discountAmount.toFixed(2)}`
            : "Venda",
        });

      if (stockError) throw stockError;

      // Criar transação financeira (receita)
      const { error: financeError } = await supabase
        .from("financial_transactions")
        .insert({
          business_id: businessId,
          type: "receita",
          category: "Produto",
          description: `Venda: ${product.name} (${qty} ${product.unit})`,
          amount: total,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: "Dinheiro",
        });

      if (financeError) throw financeError;

      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error processing sale:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível processar a venda",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Vender Produto
          </DialogTitle>
          <DialogDescription>
            {product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label>Quantidade *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={product.current_quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Disponível: {product.current_quantity} {product.unit}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Desconto</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value) => setDiscountType(value as "percent" | "value")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percent" id="percent" />
                <Label htmlFor="percent" className="font-normal cursor-pointer">
                  Percentual (%)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="value" id="value" />
                <Label htmlFor="value" className="font-normal cursor-pointer">
                  Valor (R$)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>
              Desconto {discountType === "percent" ? "(%)" : "(R$)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discountType === "percent" ? "100" : subtotal.toString()}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto:</span>
                <span>- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Processando..." : "Finalizar Venda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
