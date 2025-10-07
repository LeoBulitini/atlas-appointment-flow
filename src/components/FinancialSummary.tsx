import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";

interface FinancialSummaryProps {
  businessId: string;
  refreshKey: number;
}

export function FinancialSummary({ businessId, refreshKey }: FinancialSummaryProps) {
  const [dailyData, setDailyData] = useState({ revenue: 0, expenses: 0, balance: 0 });
  const [monthlyData, setMonthlyData] = useState({ revenue: 0, expenses: 0, balance: 0 });
  const [yearlyData, setYearlyData] = useState({ revenue: 0, expenses: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [businessId, refreshKey]);

  const fetchSummary = async () => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const yearStart = startOfYear(today);
    const yearEnd = endOfYear(today);

    // Daily
    const { data: dailyTransactions } = await supabase
      .from("financial_transactions")
      .select("type, amount")
      .eq("business_id", businessId)
      .eq("transaction_date", format(today, "yyyy-MM-dd"));

    const dailyRevenue = dailyTransactions?.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const dailyExpenses = dailyTransactions?.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Monthly
    const { data: monthlyTransactions } = await supabase
      .from("financial_transactions")
      .select("type, amount")
      .eq("business_id", businessId)
      .gte("transaction_date", format(monthStart, "yyyy-MM-dd"))
      .lte("transaction_date", format(monthEnd, "yyyy-MM-dd"));

    const monthlyRevenue = monthlyTransactions?.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const monthlyExpenses = monthlyTransactions?.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Yearly
    const { data: yearlyTransactions } = await supabase
      .from("financial_transactions")
      .select("type, amount")
      .eq("business_id", businessId)
      .gte("transaction_date", format(yearStart, "yyyy-MM-dd"))
      .lte("transaction_date", format(yearEnd, "yyyy-MM-dd"));

    const yearlyRevenue = yearlyTransactions?.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const yearlyExpenses = yearlyTransactions?.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    setDailyData({ revenue: dailyRevenue, expenses: dailyExpenses, balance: dailyRevenue - dailyExpenses });
    setMonthlyData({ revenue: monthlyRevenue, expenses: monthlyExpenses, balance: monthlyRevenue - monthlyExpenses });
    setYearlyData({ revenue: yearlyRevenue, expenses: yearlyExpenses, balance: yearlyRevenue - yearlyExpenses });
    setLoading(false);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  const SummaryCards = ({ data }: { data: typeof dailyData }) => (
    <div className="grid md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            R$ {data.revenue.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            R$ {data.expenses.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            R$ {data.balance.toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Tabs defaultValue="monthly">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="daily">Hoje</TabsTrigger>
        <TabsTrigger value="monthly">Mês</TabsTrigger>
        <TabsTrigger value="yearly">Ano</TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="space-y-4">
        <SummaryCards data={dailyData} />
      </TabsContent>

      <TabsContent value="monthly" className="space-y-4">
        <SummaryCards data={monthlyData} />
      </TabsContent>

      <TabsContent value="yearly" className="space-y-4">
        <SummaryCards data={yearlyData} />
      </TabsContent>
    </Tabs>
  );
}