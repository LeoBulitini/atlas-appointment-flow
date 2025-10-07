import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TransactionsListProps {
  businessId: string;
  refreshKey: number;
}

export function TransactionsList({ businessId, refreshKey }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{transaction.description}</span>
                    <Badge variant={transaction.type === "receita" ? "default" : "secondary"}>
                      {transaction.type === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.category} • {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
                    {transaction.payment_method && ` • ${transaction.payment_method}`}
                  </div>
                </div>
                <div className={`text-lg font-bold ${transaction.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                  {transaction.type === "receita" ? "+" : "-"}R$ {Number(transaction.amount).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}