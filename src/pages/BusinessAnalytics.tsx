import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AnalyticsData {
  totalClients: number;
  totalRevenue: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topClients: Array<{ name: string; appointments: number }>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--border))'];

export default function BusinessAnalytics() {
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalClients: 0,
    totalRevenue: 0,
    topServices: [],
    topClients: [],
    hourlyDistribution: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      navigate("/business/setup");
      return;
    }

    setBusinessId(business.id);

    // Fetch completed appointments with services
    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id,
        client_id,
        appointment_time,
        service_id,
        services (name, price),
        profiles!client_id (full_name)
      `)
      .eq("business_id", business.id)
      .eq("status", "completed");

    if (appointments) {
      // Calculate total clients (unique)
      const uniqueClients = new Set(appointments.map(a => a.client_id)).size;

      // Calculate total revenue
      const revenue = appointments.reduce((sum, a) => sum + Number(a.services?.price || 0), 0);

      // Top services
      const serviceMap = new Map<string, { count: number; revenue: number }>();
      appointments.forEach(a => {
        if (a.services) {
          const existing = serviceMap.get(a.services.name) || { count: 0, revenue: 0 };
          serviceMap.set(a.services.name, {
            count: existing.count + 1,
            revenue: existing.revenue + Number(a.services.price),
          });
        }
      });
      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Top clients
      const clientMap = new Map<string, { name: string; appointments: number }>();
      appointments.forEach(a => {
        if (a.profiles) {
          const existing = clientMap.get(a.client_id) || { name: a.profiles.full_name, appointments: 0 };
          clientMap.set(a.client_id, {
            name: existing.name,
            appointments: existing.appointments + 1,
          });
        }
      });
      const topClients = Array.from(clientMap.values())
        .sort((a, b) => b.appointments - a.appointments)
        .slice(0, 5);

      // Hourly distribution
      const hourMap = new Map<string, number>();
      appointments.forEach(a => {
        const hour = a.appointment_time.split(":")[0] + ":00";
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });
      const hourlyDistribution = Array.from(hourMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      setAnalytics({
        totalClients: uniqueClients,
        totalRevenue: revenue,
        topServices,
        topClients,
        hourlyDistribution,
      });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/business")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-8">Relatório de Faturamento</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {analytics.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalClients}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Serviço</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {analytics.topServices[0]?.name || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.topServices[0]?.count || 0} agendamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horário Popular</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {analytics.hourlyDistribution.reduce((max, curr) => 
                  curr.count > max.count ? curr : max, 
                  { hour: "N/A", count: 0 }
                ).hour}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topServices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-muted-foreground">{client.appointments} agendamentos</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Horários</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
