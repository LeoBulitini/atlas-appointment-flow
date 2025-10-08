import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { formatCurrency, formatPercent, ProductSalesMetrics } from "@/lib/stock-report-utils";

interface TopSellingProductsProps {
  products: ProductSalesMetrics[];
  loading: boolean;
}

export const TopSellingProducts = ({ products, loading }: TopSellingProductsProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhuma venda registrada no período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Produtos Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd. Vendida</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow key={product.productId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell className="text-right">{product.totalQuantity}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(product.totalDiscount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.totalCost)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(product.totalProfit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={product.profitMargin > 0 ? "text-green-600" : "text-red-600"}>
                      {formatPercent(product.profitMargin)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
