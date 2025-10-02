import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, Plus, MessageCircle, Link as LinkIcon, Copy, BarChart3, Star, X, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/DateRangePicker";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { Switch } from "@/components/ui/switch";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date(new Date().setDate(new Date().getDate() + 30))),
  });

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  useEffect(() => {
    const initDashboard = async () => {
      // Verificar autenticação
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Chamar função para completar agendamentos passados
      try {
        await supabase.functions.invoke('complete-appointments');
        console.log('Complete appointments function called successfully');
      } catch (error) {
        console.error('Error calling complete-appointments:', error);
      }

      // Buscar dados do negócio
      fetchBusinessData();
    };

    initDashboard();

    const appointmentsChannel = supabase
      .channel("business-appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchBusinessData();
      })
      .subscribe();

    const servicesChannel = supabase
      .channel("services-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        fetchBusinessData();
      })
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

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (businessError && businessError.code !== "PGRST116") throw businessError;

      if (businessData) {
        setBusiness(businessData);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", businessData.id);
        
        setServices(servicesData || []);

        const { data: appointmentsData } = await supabase
          .from("appointments")
          .select(`
            *,
            profiles (full_name, phone),
            appointment_services (
              service_id,
              services (name, price)
            )
          `)
          .eq("business_id", businessData.id)
          .order("appointment_date", { ascending: true });

        setAppointments(appointmentsData || []);
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados da empresa." });
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

      toast({ title: "Serviço adicionado!", description: "Seu serviço foi criado com sucesso." });
      setShowServiceDialog(false);
      setServiceName("");
      setServiceDescription("");
      setServiceDuration("");
      setServicePrice("");
      fetchBusinessData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "completed" | "cancelled") => {
    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
      if (error) throw error;
      toast({ title: "Status atualizado", description: "O status do agendamento foi atualizado." });
      fetchBusinessData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o agendamento." });
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointmentId) return;
    await handleUpdateAppointmentStatus(selectedAppointmentId, "cancelled");
    setShowCancelDialog(false);
    setSelectedAppointmentId(null);
  };

  const handleWhatsApp = (phone: string, clientName: string) => {
    const formattedPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá ${clientName}, tudo bem? Aqui é da ${business?.name}!`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  const handleCopyShareLink = () => {
    const link = `${window.location.origin}/booking/${business.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "O link de agendamento foi copiado para a área de transferência." });
  };

  const handleToggleBusinessStatus = async (isActive: boolean) => {
    if (!business) return;

    // Se tentar desativar, verificar se há agendamentos pendentes ou confirmados
    if (!isActive) {
      const activeAppointments = appointments.filter(
        (app) => app.status === "pending" || app.status === "confirmed"
      );

      if (activeAppointments.length > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível desativar",
          description: `Você tem ${activeAppointments.length} agendamento(s) pendente(s) ou confirmado(s). Cancele-os ou aguarde a conclusão antes de desativar.`,
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("businesses")
        .update({ is_active: isActive })
        .eq("id", business.id);

      if (error) throw error;

      setBusiness({ ...business, is_active: isActive });
      toast({
        title: isActive ? "Empresa ativada!" : "Empresa desativada",
        description: isActive
          ? "Sua empresa agora está visível no Explorar e pode receber agendamentos."
          : "Sua empresa foi desativada e não aparecerá mais no Explorar.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const todayAppointments = appointments.filter(
    (app) => app.status !== "cancelled" && format(parseISO(app.appointment_date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  const filteredAppointments = appointments.filter((app) => {
    const appDate = parseISO(app.appointment_date);
    return isWithinInterval(appDate, { start: dateRange.from, end: dateRange.to });
  });

  const completedAppointments = appointments.filter((app) => app.status === "completed");
  const totalRevenue = completedAppointments.reduce((sum, app) => {
    const appointmentTotal = app.appointment_services?.reduce((serviceSum: number, as: any) => 
      serviceSum + Number(as.services?.price || 0), 0) || 0;
    return sum + appointmentTotal;
  }, 0);

  const cancelledAppointments = filteredAppointments.filter((app) => app.status === "cancelled");

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

  const renderAppointmentCard = (appointment: any) => {
    const appointmentServices = appointment.appointment_services || [];
    const totalPrice = appointmentServices.reduce((sum: number, as: any) => 
      sum + Number(as.services?.price || 0), 0);
    const servicesNames = appointmentServices.map((as: any) => as.services?.name).join(", ");

    return (
      <Card key={appointment.id} className="mb-4">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <p className="font-semibold text-lg">{appointment.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground">{servicesNames || "Sem serviços"}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
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
          {appointment.status === "pending" && (
            <Button size="sm" onClick={() => handleUpdateAppointmentStatus(appointment.id, "confirmed")}>
              Confirmar
            </Button>
          )}
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedAppointment(appointment);
                  setShowRescheduleDialog(true);
                }}
              >
                Alterar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setSelectedAppointmentId(appointment.id);
                  setShowCancelDialog(true);
                }}
              >
                Cancelar
              </Button>
              {appointment.profiles?.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWhatsApp(appointment.profiles.phone, appointment.profiles.full_name)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
    );
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
          <p className="text-muted-foreground mb-8">Você ainda não tem uma empresa cadastrada. Complete seu perfil para começar!</p>
          <Button onClick={() => navigate("/business/setup")}>Cadastrar Empresa</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard da Empresa</h1>
            <p className="text-muted-foreground">{business.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleCopyShareLink}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Copiar Link
            </Button>
            <Button onClick={() => navigate("/business/analytics")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Relatórios
            </Button>
            <Button onClick={() => navigate("/business/reviews")}>
              <Star className="mr-2 h-4 w-4" />
              Avaliações
            </Button>
            <Button onClick={() => navigate("/business/clients")}>
              <Users className="mr-2 h-4 w-4" />
              Clientes
            </Button>
            <Button onClick={() => navigate("/business/settings")}>Configurações</Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Power className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Status da Empresa</p>
                  <p className="text-sm text-muted-foreground">
                    {business.is_active 
                      ? "Sua empresa está ativa e visível no Explorar" 
                      : "Sua empresa está desativada e não aparece no Explorar"}
                  </p>
                </div>
              </div>
              <Switch
                checked={business.is_active}
                onCheckedChange={handleToggleBusinessStatus}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Agendamentos Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{todayAppointments.length}</p>
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
                <X className="h-5 w-5" />
                Cancelados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-600">
                {appointments.filter((a) => a.status === "cancelled").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {todayAppointments.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Agendamentos de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {todayAppointments.map(renderAppointmentCard)}
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Agendamentos</CardTitle>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming">Próximos</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                {filteredAppointments
                  .filter((a) => a.status !== "completed" && a.status !== "cancelled" && parseISO(a.appointment_date) >= new Date())
                  .map(renderAppointmentCard)}
              </TabsContent>
              <TabsContent value="history">
                {filteredAppointments
                  .filter((a) => a.status === "completed" || (parseISO(a.appointment_date) < new Date() && a.status !== "cancelled"))
                  .map(renderAppointmentCard)}
              </TabsContent>
              <TabsContent value="cancelled">
                {cancelledAppointments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum agendamento cancelado
                  </div>
                ) : (
                  cancelledAppointments.map(renderAppointmentCard)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment}>Cancelar Agendamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedAppointment && (
        <RescheduleDialog
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          appointmentId={selectedAppointment.id}
          businessId={selectedAppointment.business_id}
          currentDate={selectedAppointment.appointment_date}
          currentTime={selectedAppointment.appointment_time}
          currentServiceId={selectedAppointment.service_id}
          onRescheduleSuccess={fetchBusinessData}
        />
      )}
    </div>
  );
};

export default BusinessDashboard;
