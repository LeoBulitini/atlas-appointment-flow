import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StockHistoryProps {
  businessId: string;
  refreshKey: number;
}

export function StockHistory({ businessId, refreshKey }: StockHistoryProps) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovements();
  }, [businessId, refreshKey]);

  const fetchMovements = async () => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        products(name, unit)
      `)
      .eq("business_id", businessId)
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setMovements(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Movimentações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação registrada
            </p>
          ) : (
            movements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-full ${movement.type === "entrada" ? "bg-green-100" : "bg-red-100"}`}>
                    {movement.type === "entrada" ? (
                      <ArrowUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{movement.products?.name}</span>
                      <Badge variant={movement.type === "entrada" ? "default" : "secondary"}>
                        {movement.type === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(movement.movement_date), "dd/MM/yyyy")}
                      {movement.reason && ` • ${movement.reason}`}
                    </div>
                    {movement.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{movement.notes}</p>
                    )}
                  </div>
                </div>
                <div className={`text-lg font-bold ${movement.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                  {movement.type === "entrada" ? "+" : "-"}{movement.quantity} {movement.products?.unit}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}