import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TransactionFormProps {
  businessId: string;
  onSuccess: () => void;
  transaction?: any;
}

export function TransactionForm({ businessId, onSuccess, transaction }: TransactionFormProps) {
  const { toast } = useToast();
  const [type, setType] = useState<"receita" | "despesa">(transaction?.type || "receita");
  const [description, setDescription] = useState(transaction?.description || "");
  const [category, setCategory] = useState(transaction?.category || "");
  const [amount, setAmount] = useState(transaction?.amount?.toString() || "");
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || "");
  const [transactionDate, setTransactionDate] = useState(
    transaction?.transaction_date || format(new Date(), "yyyy-MM-dd")
  );
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!transaction;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            type,
            description,
            category,
            amount: parseFloat(amount),
            payment_method: paymentMethod || null,
            transaction_date: transactionDate,
          })
          .eq("id", transaction.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Transação atualizada com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .insert({
            business_id: businessId,
            type,
            description,
            category,
            amount: parseFloat(amount),
            payment_method: paymentMethod || null,
            transaction_date: transactionDate,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Transação registrada com sucesso",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível registrar a transação",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tipo *</Label>
        <Select value={type} onValueChange={(value: any) => setType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Descrição *</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Categoria *</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ex: Corte, Produto, Aluguel, Energia"
          required
        />
      </div>

      <div>
        <Label>Valor (R$) *</Label>
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Forma de Pagamento</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
            <SelectItem value="Pix">Pix</SelectItem>
            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Data *</Label>
        <Input
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando..." : (isEditing ? "Atualizar" : "Salvar")}
      </Button>
    </form>
  );
}