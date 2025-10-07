import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface FinancialChartProps {
  businessId: string;
  refreshKey: number;
}

export function FinancialChart({ businessId, refreshKey }: FinancialChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, [businessId, refreshKey]);

  const fetchChartData = async () => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const { data } = await supabase
      .from("financial_transactions")
      .select("type, category, amount")
      .eq("business_id", businessId)
      .gte("transaction_date", format(monthStart, "yyyy-MM-dd"))
      .lte("transaction_date", format(monthEnd, "yyyy-MM-dd"));

    if (data) {
      const categories = Array.from(new Set(data.map(t => t.category)));
      const chartData = categories.map(category => {
        const categoryTransactions = data.filter(t => t.category === category);
        const revenue = categoryTransactions
          .filter(t => t.type === "receita")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = categoryTransactions
          .filter(t => t.type === "despesa")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          category,
          receitas: revenue,
          despesas: expenses,
        };
      });

      setChartData(chartData);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receitas x Despesas por Categoria (Mês Atual)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="receitas" fill="hsl(var(--chart-1))" name="Receitas" />
            <Bar dataKey="despesas" fill="hsl(var(--chart-2))" name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}