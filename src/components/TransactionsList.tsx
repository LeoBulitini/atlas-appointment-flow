import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface TransactionsListProps {
  businessId: string;
  refreshKey: number;
  onEdit: (transaction: any) => void;
}

export function TransactionsList({ businessId, refreshKey, onEdit }: TransactionsListProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);

  useEffect(() => {
    fetchTransactions();
  }, [businessId, refreshKey]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, filterCategory, startDate, endDate]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    if (startDate) {
      filtered = filtered.filter(t => t.transaction_date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(t => t.transaction_date <= endDate);
    }

    setFilteredTransactions(filtered);
  };

  const handleDeleteClick = (transaction: any) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", transactionToDelete.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Transação excluída com sucesso",
      });
      fetchTransactions();
    }

    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const exportToCSV = () => {
    const headers = ["Data", "Tipo", "Descrição", "Categoria", "Valor", "Forma de Pagamento"];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), "dd/MM/yyyy"),
      t.type === "receita" ? "Receita" : "Despesa",
      t.description,
      t.category,
      t.amount.toFixed(2),
      t.payment_method || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const categories = Array.from(new Set(transactions.map(t => t.category)));

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transações</CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Categoria</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma transação encontrada
            </p>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`p-4 border rounded-lg ${isMobile ? 'flex flex-col gap-3' : 'flex items-center justify-between'}`}
              >
                {/* Descrição no topo */}
                <div className={isMobile ? 'w-full' : 'flex-1'}>
                  <div className="font-medium mb-2">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.category} • {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
                    {transaction.payment_method && ` • ${transaction.payment_method}`}
                  </div>
                </div>

                {/* Tipo e valor */}
                <div className={`flex items-center gap-3 ${isMobile ? 'w-full justify-between' : 'gap-4'}`}>
                  <Badge variant={transaction.type === "receita" ? "default" : "secondary"}>
                    {transaction.type === "receita" ? "Receita" : "Despesa"}
                  </Badge>
                  <div className={`text-lg font-bold ${transaction.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "receita" ? "+" : "-"}R$ {Number(transaction.amount).toFixed(2)}
                  </div>
                </div>

                {/* Botões de editar/excluir */}
                <div className={`flex gap-2 ${isMobile ? 'w-full justify-end' : ''}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(transaction)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a transação "{transactionToDelete?.description}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}