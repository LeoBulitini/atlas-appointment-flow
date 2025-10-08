import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/DateRangePicker";
import { TopSellingProducts } from "@/components/TopSellingProducts";
import { RevenueReport } from "@/components/RevenueReport";
import { TotalStockReport } from "@/components/TotalStockReport";
import { calculateProductMetrics, ProductSalesMetrics } from "@/lib/stock-report-utils";
import { format, subDays } from "date-fns";

interface StockReportsProps {
  businessId: string;
}

export const StockReports = ({ businessId }: StockReportsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [topProducts, setTopProducts] = useState<ProductSalesMetrics[]>([]);
  const [revenueData, setRevenueData] = useState({
    grossRevenue: 0,
    totalDiscounts: 0,
    netRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    profitMargin: 0,
  });
  const [stockItems, setStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchReports();
  }, [businessId, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTopSellingProducts(),
        fetchStockTotal(),
      ]);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar os dados dos relatórios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTopSellingProducts = async () => {
    const { data: movements, error } = await supabase
      .from("stock_movements")
      .select(`
        id,
        quantity,
        notes,
        product_id,
        products (
          id,
          name,
          cost_price,
          selling_price
        )
      `)
      .eq("business_id", businessId)
      .eq("type", "saida")
      .eq("reason", "venda")
      .gte("movement_date", format(dateRange.from, "yyyy-MM-dd"))
      .lte("movement_date", format(dateRange.to, "yyyy-MM-dd"));

    if (error) throw error;

    const salesData = movements?.map((m: any) => ({
      product_id: m.products.id,
      product_name: m.products.name,
      quantity: m.quantity,
      cost_price: m.products.cost_price || 0,
      selling_price: m.products.selling_price || 0,
      notes: m.notes,
    })) || [];

    const metrics = calculateProductMetrics(salesData);
    setTopProducts(metrics);

    // Calculate revenue data
    const grossRevenue = metrics.reduce((sum, p) => sum + p.totalRevenue + p.totalDiscount, 0);
    const totalDiscounts = metrics.reduce((sum, p) => sum + p.totalDiscount, 0);
    const netRevenue = metrics.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCost = metrics.reduce((sum, p) => sum + p.totalCost, 0);
    const grossProfit = netRevenue - totalCost;
    const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    setRevenueData({
      grossRevenue,
      totalDiscounts,
      netRevenue,
      totalCost,
      grossProfit,
      profitMargin,
    });
  };

  const fetchStockTotal = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, current_quantity, cost_price, selling_price, unit")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .gt("current_quantity", 0)
      .order("name");

    if (error) throw error;

    const items = data?.map((item) => ({
      ...item,
      total_cost: (item.cost_price || 0) * item.current_quantity,
      total_selling_value: (item.selling_price || 0) * item.current_quantity,
      potential_profit: ((item.selling_price || 0) - (item.cost_price || 0)) * item.current_quantity,
    })) || [];

    setStockItems(items);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Relatórios</h2>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      <Tabs defaultValue="top-selling" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="top-selling">Mais Vendidos</TabsTrigger>
          <TabsTrigger value="revenue">Faturamento</TabsTrigger>
          <TabsTrigger value="stock-total">Estoque Total</TabsTrigger>
        </TabsList>

        <TabsContent value="top-selling">
          <TopSellingProducts products={topProducts} loading={loading} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueReport {...revenueData} loading={loading} />
        </TabsContent>

        <TabsContent value="stock-total">
          <TotalStockReport items={stockItems} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
