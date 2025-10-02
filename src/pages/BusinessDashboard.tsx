import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceDialog, setShowServiceDialog] = useState(false);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  useEffect(() => {
    fetchBusinessData();

    const appointmentsChannel = supabase
      .channel("business-appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          fetchBusinessData();
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel("services-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "services",
        },
        () => {
          fetchBusinessData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(servicesChannel);
    };
  }, []);

  const fetchBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch business
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (businessError && businessError.code !== "PGRST116") throw businessError;

      if (businessData) {
        setBusiness(businessData);

        // Fetch services
        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", businessData.id);
        
        setServices(servicesData || []);

        // Fetch appointments
        const { data: appointmentsData } = await supabase
          .from("appointments")
          .select(`
            *,
            profiles (full_name, phone),
            services (name, price)
          `)
          .eq("business_id", businessData.id)
          .order("appointment_date", { ascending: true });

        setAppointments(appointmentsData || []);
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados da empresa.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    try {
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        name: serviceName,
        description: serviceDescription,
        duration_minutes: parseInt(serviceDuration),
        price: parseFloat(servicePrice),
      });

      if (error) throw error;

      toast({
        title: "Serviço adicionado!",
        description: "Seu serviço foi criado com sucesso.",
      });

      setShowServiceDialog(false);
      setServiceName("");
      setServiceDescription("");
      setServiceDuration("");
      setServicePrice("");
      fetchBusinessData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointmentId: string, 
    status: "pending" | "confirmed" | "completed" | "cancelled"
  ) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado.",
      });

      fetchBusinessData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o agendamento.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Configure sua Empresa</h1>
          <p className="text-muted-foreground mb-8">
            Você ainda não tem uma empresa cadastrada. Complete seu perfil para começar!
          </p>
          <Button onClick={() => navigate("/business/setup")}>Cadastrar Empresa</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard da Empresa</h1>
            <p className="text-muted-foreground">{business.name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/business/clients")}>
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </Button>
            <Button onClick={() => navigate("/business/settings")}>
              Configurações
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{appointments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {appointments.filter((a) => a.status === "pending").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{services.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                R$ {appointments
                  .filter((a) => a.status === "completed")
                  .reduce((sum, a) => sum + Number(a.services.price), 0)
                  .toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum agendamento ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{appointment.profiles.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{appointment.services.name}</p>
                        </div>
                        <Badge className={
                          appointment.status === "confirmed" ? "bg-green-500" :
                          appointment.status === "pending" ? "bg-yellow-500" :
                          appointment.status === "completed" ? "bg-blue-500" :
                          "bg-gray-500"
                        }>
                          {appointment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{appointment.appointment_date.split('-').reverse().join('/')}</span>
                        <span>{appointment.appointment_time}</span>
                      </div>
                      {appointment.status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, "confirmed")}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, "cancelled")}
                          >
                            Recusar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BusinessDashboard;
