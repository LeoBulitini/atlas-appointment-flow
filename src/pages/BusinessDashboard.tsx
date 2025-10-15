import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, DollarSign, Plus, MessageCircle, Link as LinkIcon, Copy, BarChart3, Star, X, Power, RefreshCw, Megaphone, Settings, LogOut, Eye, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/DateRangePicker";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { format, startOfDay, endOfDay, isWithinInterval, parseISO, subDays, addDays } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { EditServiceDialog } from "@/components/EditServiceDialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

      // Buscar dados do negócio
      await fetchBusinessData();

      // Chamar função para completar agendamentos passados de forma assíncrona (não bloqueia UI)
      supabase.functions
        .invoke('complete-appointments')
        .then(() => console.log('Complete appointments function called successfully'))
        .catch((error) => console.error('Error calling complete-appointments:', error));
    };

    initDashboard();

    const appointmentsChannel = supabase
      .channel("business-appointments-changes")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "appointments",
        filter: `business_id=eq.${business?.id}` 
      }, (payload) => {
        // Update incremental ao invés de recarregar tudo
        if (payload.eventType === 'INSERT') {
          setAppointments(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setAppointments(prev => prev.map(app => app.id === payload.new.id ? payload.new : app));
        } else if (payload.eventType === 'DELETE') {
          setAppointments(prev => prev.filter(app => app.id !== payload.old.id));
        }
      })
      .subscribe();

    const servicesChannel = supabase
      .channel("services-changes")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "services",
        filter: `business_id=eq.${business?.id}`
      }, (payload) => {
        // Update incremental para serviços
        if (payload.eventType === 'INSERT') {
          setServices(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setServices(prev => prev.map(svc => svc.id === payload.new.id ? payload.new : svc));
        } else if (payload.eventType === 'DELETE') {
          setServices(prev => prev.filter(svc => svc.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(servicesChannel);
    };
  }, [business?.id]);

  const fetchBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("id, name, logo_url, is_active, view_count")
        .eq("owner_id", user.id)
        .single();

      if (businessError && businessError.code !== "PGRST116") throw businessError;

      if (businessData) {
        setBusiness(businessData);

        // Buscar apenas serviços ativos
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name, description, duration_minutes, price, image_url, is_active")
          .eq("business_id", businessData.id)
          .eq("is_active", true);
        
        setServices(servicesData || []);

        // Otimização: Buscar apenas agendamentos dos últimos 30 dias e próximos 90 dias
        const today = new Date();
        const startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        const endDate = format(addDays(today, 90), 'yyyy-MM-dd');

        const { data: appointmentsData } = await supabase
          .from("appointments")
          .select(`
            id,
            appointment_date,
            appointment_time,
            end_time,
            status,
            used_loyalty_redemption,
            business_id,
            service_id,
            profiles!appointments_client_id_fkey (full_name, phone),
            appointment_services (
              service_id,
              services (name, price)
            )
          `)
          .eq("business_id", businessData.id)
          .gte("appointment_date", startDate)
          .lte("appointment_date", endDate)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });

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

  // Usar useMemo para otimizar cálculos pesados
  const todayAppointments = useMemo(() => {
    const today = formatInTimeZone(toZonedTime(new Date(), BRAZIL_TZ), BRAZIL_TZ, "yyyy-MM-dd");
    return appointments
      .filter((app) => format(parseISO(app.appointment_date), "yyyy-MM-dd") === today)
      .sort((a, b) => {
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
        
        return a.appointment_time.localeCompare(b.appointment_time);
      });
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((app) => {
        const appDate = parseISO(app.appointment_date);
        return isWithinInterval(appDate, { start: dateRange.from, end: dateRange.to });
      })
      .sort((a, b) => {
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
        
        const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return a.appointment_time.localeCompare(b.appointment_time);
      });
  }, [appointments, dateRange]);

  const { completedAppointments, totalRevenue } = useMemo(() => {
    const completed = appointments.filter((app) => app.status === "completed");
    const revenue = completed.reduce((sum, app) => {
      const appointmentTotal = app.appointment_services?.reduce((serviceSum: number, as: any) => 
        serviceSum + Number(as.services?.price || 0), 0) || 0;
      return sum + appointmentTotal;
    }, 0);
    
    return { completedAppointments: completed, totalRevenue: revenue };
  }, [appointments]);

  const cancelledAppointments = useMemo(() => {
    return filteredAppointments.filter((app) => app.status === "cancelled");
  }, [filteredAppointments]);

  const pendingCount = useMemo(() => {
    return appointments.filter((app) => app.status === "pending").length;
  }, [appointments]);

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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          
          <Skeleton className="h-24 w-full mb-8" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </main>
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
              onClick={() => window.location.reload()}
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
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
                <DropdownMenuItem onClick={() => navigate("/business/subscription")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Assinatura
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
              <div className="text-2xl font-bold">{pendingCount}</div>
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
                  .filter((a) => (a.status === "pending" || a.status === "confirmed") && parseISO(a.appointment_date) >= new Date())
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
