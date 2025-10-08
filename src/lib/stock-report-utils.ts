export const extractDiscountFromNotes = (notes: string | null): number => {
  if (!notes) return 0;
  
  // Pattern: "Venda com desconto de R$ XX.XX" or "Venda com desconto de XX%"
  const reaisMatch = notes.match(/desconto de R\$\s*([\d,.]+)/i);
  if (reaisMatch) {
    return parseFloat(reaisMatch[1].replace(',', '.'));
  }
  
  return 0;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

export interface ProductSalesMetrics {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalDiscount: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
}

export const calculateProductMetrics = (
  sales: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    notes: string | null;
  }>
): ProductSalesMetrics[] => {
  const productsMap = new Map<string, ProductSalesMetrics>();
  
  sales.forEach((sale) => {
    const discount = extractDiscountFromNotes(sale.notes);
    const cost = sale.cost_price * sale.quantity;
    const revenueBeforeDiscount = sale.selling_price * sale.quantity;
    const revenue = revenueBeforeDiscount - discount;
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    if (productsMap.has(sale.product_id)) {
      const existing = productsMap.get(sale.product_id)!;
      existing.totalQuantity += sale.quantity;
      existing.totalDiscount += discount;
      existing.totalCost += cost;
      existing.totalRevenue += revenue;
      existing.totalProfit += profit;
      existing.profitMargin = existing.totalRevenue > 0 
        ? (existing.totalProfit / existing.totalRevenue) * 100 
        : 0;
    } else {
      productsMap.set(sale.product_id, {
        productId: sale.product_id,
        productName: sale.product_name,
        totalQuantity: sale.quantity,
        totalDiscount: discount,
        totalCost: cost,
        totalRevenue: revenue,
        totalProfit: profit,
        profitMargin,
      });
    }
  });
  
  return Array.from(productsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
};
