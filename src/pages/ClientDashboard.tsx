import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Star, DollarSign, RefreshCw, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReviewDialog } from "@/components/ReviewDialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  business_id: string;
  service_id: string;
  businesses: { name: string; address: string; city: string };
  appointment_services: Array<{
    service_id: string;
    services: { name: string; price: number };
  }>;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchAppointments();

    const channel = supabase.channel("appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          businesses (name, address, city),
          appointment_services (
            service_id,
            services (name, price)
          )
        `)
        .eq("client_id", user.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar seus agendamentos." });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appointmentId);
      if (error) throw error;
      
      // Send email notification (don't block on failure)
      supabase.functions
        .invoke('send-appointment-email', {
          body: {
            appointmentId,
            type: 'appointment_cancelled'
          }
        })
        .then((emailResult) => {
          if (emailResult.error) {
            console.error('[Email] Error sending cancellation notification:', emailResult.error);
          }
        })
        .catch((err) => console.error('[Email] Failed to send cancellation notification:', err));
      
      toast({ title: "Agendamento cancelado", description: "Seu agendamento foi cancelado com sucesso." });
      fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível cancelar o agendamento." });
    }
  };

  const handleRebook = (appointment: Appointment) => {
    navigate(`/booking/${appointment.business_id}`);
  };

  const openReviewDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setReviewDialogOpen(true);
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAppointments(), fetchUserData()]);
      toast({ title: "Dados atualizados!", description: "Seus dados foram atualizados com sucesso." });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar os dados." });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      pending: { label: "Pendente", className: "bg-yellow-500" },
      confirmed: { label: "Confirmado", className: "bg-green-500" },
      completed: { label: "Concluído", className: "bg-blue-500" },
      cancelled: { label: "Cancelado", className: "bg-gray-500" },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard do Cliente</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.full_name}!</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">Total de Agendamentos</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-primary">{appointments.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Próximos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{appointments.filter((a) => a.status === "confirmed").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Concluídos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{appointments.filter((a) => a.status === "completed").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Meus Agendamentos</CardTitle></CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Você ainda não tem agendamentos</p>
                <Button onClick={() => navigate("/")}>Explorar Empresas</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => {
                  const appointmentServices = appointment.appointment_services || [];
                  const totalPrice = appointmentServices.reduce((sum: number, as: any) => 
                    sum + Number(as.services?.price || 0), 0);
                  const servicesNames = appointmentServices.map((as: any) => as.services?.name).join(", ");

                  return (
                    <Card key={appointment.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{appointment.businesses.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{servicesNames || "Sem serviços"}</p>
                            <div className="flex flex-wrap gap-3 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(appointment.appointment_date), "dd/MM/yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {appointment.appointment_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                R$ {totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(appointment.status === "pending" || appointment.status === "confirmed") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRescheduleDialog(appointment)}
                              >
                                Alterar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleCancelAppointment(appointment.id)}>
                                Cancelar
                              </Button>
                            </>
                          )}
                          {appointment.status === "completed" && (
                            <>
                              <Button size="sm" onClick={() => handleRebook(appointment)}>Agendar Novamente</Button>
                              <Button size="sm" variant="outline" onClick={() => openReviewDialog(appointment)}>
                                <Star className="mr-2 h-4 w-4" />
                                Avaliar
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedAppointment && (
        <>
          <ReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            appointmentId={selectedAppointment.id}
            businessId={selectedAppointment.business_id}
            onReviewSubmitted={fetchAppointments}
          />
          <RescheduleDialog
            open={rescheduleDialogOpen}
            onOpenChange={setRescheduleDialogOpen}
            appointmentId={selectedAppointment.id}
            businessId={selectedAppointment.business_id}
            currentDate={selectedAppointment.appointment_date}
            currentTime={selectedAppointment.appointment_time}
            currentServiceId={selectedAppointment.service_id}
            onRescheduleSuccess={fetchAppointments}
          />
        </>
      )}
    </div>
  );
};

export default ClientDashboard;
