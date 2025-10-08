import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, Plus, MessageCircle, Link as LinkIcon, Copy, BarChart3, Star, X, Power, RefreshCw, Megaphone, Settings, LogOut, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/DateRangePicker";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { EditServiceDialog } from "@/components/EditServiceDialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit } from "lucide-react";
import SubscriptionBanner from "@/components/SubscriptionBanner";

const BRAZIL_TZ = 'America/Sao_Paulo';

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showEditServiceDialog, setShowEditServiceDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date(new Date().setDate(new Date().getDate() + 30))),
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [syncingSubscription, setSyncingSubscription] = useState(false);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceImageUrl, setServiceImageUrl] = useState<string | null>(null);

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
      await fetchBusinessData();

      // Sincronizar assinatura automaticamente
      await syncSubscription();
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

        // Fetch subscription data
        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", businessData.id)
          .single();
        
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados da empresa." });
    } finally {
      setLoading(false);
    }
  };

  const syncSubscription = async () => {
    setSyncingSubscription(true);
    try {
      await supabase.functions.invoke('sync-stripe-subscription');
      
      // Fetch updated subscription data
      if (business?.id) {
        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", business.id)
          .single();
        
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.error('Error syncing subscription:', error);
    } finally {
      setSyncingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível abrir o portal de gerenciamento.",
      });
    }
  };

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;
    try {
      const end = parseISO(endDate);
      const today = new Date();
      const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    } catch {
      return 0;
    }
  };

  const getSubscriptionStatusColor = (daysRemaining: number) => {
    if (daysRemaining >= 15) return "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400";
    if (daysRemaining >= 7) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400";
    if (daysRemaining >= 1) return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400";
    return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400";
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

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !editingService) return;

    try {
      const { error } = await supabase
        .from("services")
        .update({
          name: serviceName,
          description: serviceDescription,
          duration_minutes: parseInt(serviceDuration),
          price: parseFloat(servicePrice),
          image_url: serviceImageUrl,
        })
        .eq("id", editingService.id);

      if (error) throw error;

      toast({ title: "Serviço atualizado!", description: "Seu serviço foi atualizado com sucesso." });
      setShowEditServiceDialog(false);
      setEditingService(null);
      setServiceName("");
      setServiceDescription("");
      setServiceDuration("");
      setServicePrice("");
      setServiceImageUrl(null);
      fetchBusinessData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const openEditServiceDialog = (service: any) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || "");
    setServiceDuration(service.duration_minutes.toString());
    setServicePrice(service.price.toString());
    setServiceImageUrl(service.image_url || null);
    setShowEditServiceDialog(true);
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "completed" | "cancelled") => {
    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
      if (error) throw error;
      
      // Send email notification (don't block on failure)
      if (status === "confirmed") {
        supabase.functions
          .invoke('send-appointment-email', {
            body: {
              appointmentId,
              type: 'appointment_confirmed'
            }
          })
          .then((emailResult) => {
            if (emailResult.error) {
              console.error('[Email] Error sending confirmation notification:', emailResult.error);
            }
          })
          .catch((err) => console.error('[Email] Failed to send confirmation notification:', err));
      }
      
      if (status === "completed") {
        supabase.functions
          .invoke('send-appointment-email', {
            body: {
              appointmentId,
              type: 'appointment_completed'
            }
          })
          .then((emailResult) => {
            if (emailResult.error) {
              console.error('[Email] Error sending completion notification:', emailResult.error);
            }
          })
          .catch((err) => console.error('[Email] Failed to send completion notification:', err));
      }
      
      toast({ title: "Status atualizado", description: "O status do agendamento foi atualizado." });
      fetchBusinessData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o agendamento." });
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointmentId) return;
    
    try {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", selectedAppointmentId);
      if (error) throw error;
      
      // Send email notification (don't block on failure)
      supabase.functions
        .invoke('send-appointment-email', {
          body: {
            appointmentId: selectedAppointmentId,
            type: 'appointment_cancelled'
          }
        })
        .then((emailResult) => {
          if (emailResult.error) {
            console.error('[Email] Error sending cancellation notification:', emailResult.error);
          }
        })
        .catch((err) => console.error('[Email] Failed to send cancellation notification:', err));
      
      toast({ title: "Status atualizado", description: "O status do agendamento foi atualizado." });
      fetchBusinessData();
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o agendamento." });
    }
    
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBusinessData();
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

  const todayAppointments = appointments
    .filter(
      (app) => format(parseISO(app.appointment_date), "yyyy-MM-dd") === formatInTimeZone(toZonedTime(new Date(), BRAZIL_TZ), BRAZIL_TZ, "yyyy-MM-dd")
    )
    .sort((a, b) => {
      // Definir prioridade: pendentes primeiro, depois confirmados, depois concluídos e cancelados
      const statusPriority: Record<string, number> = {
        pending: 1,
        confirmed: 2,
        completed: 3,
        cancelled: 4,
      };
      
      const priorityA = statusPriority[a.status] || 5;
      const priorityB = statusPriority[b.status] || 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Se tiverem o mesmo status, ordenar por horário
      return a.appointment_time.localeCompare(b.appointment_time);
    });

  const filteredAppointments = appointments
    .filter((app) => {
      const appDate = parseISO(app.appointment_date);
      return isWithinInterval(appDate, { start: dateRange.from, end: dateRange.to });
    })
    .sort((a, b) => {
      // Definir prioridade: pendentes primeiro, depois confirmados, depois concluídos e cancelados
      const statusPriority: Record<string, number> = {
        pending: 1,
        confirmed: 2,
        completed: 3,
        cancelled: 4,
      };
      
      const priorityA = statusPriority[a.status] || 5;
      const priorityB = statusPriority[b.status] || 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Se tiverem o mesmo status, ordenar por data e horário
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return a.appointment_time.localeCompare(b.appointment_time);
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
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-base md:text-lg">{appointment.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground mt-1">{servicesNames || "Sem serviços"}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(appointment.status)}
                {appointment.profiles?.phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-9 px-3"
                    onClick={() => handleWhatsApp(appointment.profiles.phone, appointment.profiles.full_name)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
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
              {appointment.used_loyalty_redemption && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Star className="h-3 w-3 mr-1" />
                  Recompensa
                </Badge>
              )}
            </div>
          </div>

        <div className="grid grid-cols-2 sm:flex gap-2">
          {appointment.status === "pending" && (
            <Button size="sm" className="min-h-10" onClick={() => handleUpdateAppointmentStatus(appointment.id, "confirmed")}>
              Confirmar
            </Button>
          )}
          {(appointment.status === "pending" || appointment.status === "confirmed") && (
            <>
              <Button
                size="sm"
                className="min-h-10"
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
                className="min-h-10"
                variant="destructive"
                onClick={() => {
                  setSelectedAppointmentId(appointment.id);
                  setShowCancelDialog(true);
                }}
              >
                Cancelar
              </Button>
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
        {/* Header with Business Logo */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {business?.logo_url && (
              <img 
                src={business.logo_url} 
                alt={business.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{business?.name || "Dashboard"}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-sm">{business?.view_count || 0}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/business/calendar")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendário
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/financial")}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Financeiro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/stock")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Estoque
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/loyalty")}>
                  <Star className="mr-2 h-4 w-4" />
                  Fidelidade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/clients")}>
                  <Users className="mr-2 h-4 w-4" />
                  Clientes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/reviews")}>
                  <Star className="mr-2 h-4 w-4" />
                  Avaliações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/analytics")}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Relatórios
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/marketing")}>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Marketing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/business/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

        <SubscriptionBanner />

        {subscription && (
          <Card className={`mb-8 border-2 ${getSubscriptionStatusColor(calculateDaysRemaining(subscription.current_period_end))}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">
                        Plano {subscription.plan_type === 'standard' ? 'Standard' : 'Professional'}
                      </p>
                      <Badge className={subscription.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {subscription.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {calculateDaysRemaining(subscription.current_period_end)} dias restantes
                      {subscription.current_period_end && (
                        <> • Próxima cobrança: {format(parseISO(subscription.current_period_end), "dd/MM/yyyy")}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleManageSubscription} variant="default">
                    <Settings className="mr-2 h-4 w-4" />
                    Gerenciar Assinatura
                  </Button>
                  <Button 
                    onClick={syncSubscription} 
                    variant="outline"
                    disabled={syncingSubscription}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncingSubscription ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!subscription && (
          <Card className="mb-8 border-2 border-orange-500/20 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10">
                    <Star className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Nenhum plano ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Assine um plano para desbloquear recursos avançados
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate('/business/subscription')} variant="default">
                  Ver Planos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter((app) => app.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <X className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cancelledAppointments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
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
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Agendamentos</CardTitle>
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming">
              <TabsList className="mb-4 w-full grid grid-cols-3">
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

      <EditServiceDialog
        open={showEditServiceDialog}
        onOpenChange={setShowEditServiceDialog}
        serviceName={serviceName}
        setServiceName={setServiceName}
        serviceDescription={serviceDescription}
        setServiceDescription={setServiceDescription}
        serviceDuration={serviceDuration}
        setServiceDuration={setServiceDuration}
        servicePrice={servicePrice}
        setServicePrice={setServicePrice}
        serviceImageUrl={serviceImageUrl}
        setServiceImageUrl={setServiceImageUrl}
        onSubmit={handleEditService}
      />
    </div>
  );
};

export default BusinessDashboard;
