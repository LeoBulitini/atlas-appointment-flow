import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { toast } from "sonner";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDraggableAppointment } from '@/hooks/useDraggableAppointment';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  status: string;
  profiles: { full_name: string };
  appointment_services: Array<{
    services: { id: string; name: string };
  }>;
}

export default function BusinessCalendar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [openingHours, setOpeningHours] = useState<any>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileMenuAppointment, setMobileMenuAppointment] = useState<Appointment | null>(null);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Item 4: Melhorar sensor de touch
        tolerance: 10,
      },
    })
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, opening_hours")
      .eq("owner_id", user.id)
      .single();

    if (business) {
      setBusinessId(business.id);
      setOpeningHours(business.opening_hours || {});
    }
  };

  const fetchAppointments = async () => {
    try {
      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles(full_name),
          appointment_services(
            services(id, name)
          )
        `)
        .eq("business_id", businessId)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    activeId,
    draggedTime,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel
  } = useDraggableAppointment({
    appointments,
    onUpdate: fetchAppointments
  });

  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    }
  }, [businessId, currentMonth]);

  // Item 7: Forçar viewMode "day" em mobile
  useEffect(() => {
    if (isMobile && viewMode !== 'day') {
      setViewMode('day');
    }
  }, [isMobile]);

  // Item 4: Prevenir scroll durante drag em mobile
  useEffect(() => {
    if (activeId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [activeId]);

  // Item 5: Calcular horários dinâmicos (1h antes/depois do funcionamento)
  const hours = useMemo(() => {
    if (!openingHours) return Array.from({ length: 24 }, (_, i) => i);
    
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()];
    const daySchedule = openingHours[dayOfWeek];
    
    if (!daySchedule || !daySchedule.isOpen) {
      return Array.from({ length: 24 }, (_, i) => i);
    }
    
    // Extrair horas de abertura e fechamento
    const openHour = parseInt(daySchedule.openTime.split(':')[0]);
    const closeHour = parseInt(daySchedule.closeTime.split(':')[0]);
    
    // 1h antes e 1h depois
    const startHour = Math.max(0, openHour - 1);
    const endHour = Math.min(23, closeHour + 1);
    
    // Gerar array de horas
    const hourArray = [];
    for (let h = startHour; h <= endHour; h++) {
      hourArray.push(h);
    }
    
    return hourArray;
  }, [openingHours, selectedDate]);

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled');
  };

  const isHourInactive = (hour: number, dayOfWeek: string) => {
    if (!openingHours) return true;
    
    const daySchedule = openingHours[dayOfWeek];
    if (!daySchedule || !daySchedule.isOpen) return true;
    
    try {
      const openTime = daySchedule.openTime;
      const closeTime = daySchedule.closeTime;
      
      if (!openTime || !closeTime) return true;
      
      const openHour = parseInt(openTime.split(':')[0]);
      const closeHour = parseInt(closeTime.split(':')[0]);
      
      return hour < openHour || hour >= closeHour;
    } catch (error) {
      console.error('Error checking hour inactive:', error);
      return true;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#22c55e';
      case 'pending':
        return '#eab308';
      case 'completed':
        return '#3b82f6';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleReadyForService = async (appointmentId: string) => {
    try {
      toast.success("Enviando notificação...", { description: "Informando o cliente que você está pronto." });
      
      const { error } = await supabase.functions.invoke('send-appointment-email', {
        body: {
          appointmentId,
          type: 'ready_for_service'
        }
      });

      if (error) throw error;
      
      toast.success("Notificação enviada!", { description: "O cliente foi avisado que você está pronto." });
    } catch (error) {
      console.error("Error sending ready notification:", error);
      toast.error("Erro", { description: "Não foi possível enviar a notificação. Tente novamente." });
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointmentId) return;
    
    try {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", selectedAppointmentId);
      if (error) throw error;
      
      supabase.functions
        .invoke('send-appointment-email', {
          body: {
            appointmentId: selectedAppointmentId,
            type: 'cancelled'
          }
        })
        .catch(error => console.error("Error sending cancellation email:", error));
      
      toast.success("Agendamento cancelado");
      setShowCancelDialog(false);
      setSelectedAppointmentId(null);
      fetchAppointments();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Erro ao cancelar agendamento");
    }
  };

  const openCancelDialog = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowCancelDialog(true);
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleDialog(true);
  };

  // Draggable Appointment Card Component
  const DraggableAppointmentCard = ({ 
    apt, 
    top, 
    height, 
    isDragging,
    draggedTime,
    getStatusBgColor,
    handleReadyForService,
    openRescheduleDialog,
    openCancelDialog 
  }: any) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: apt.id,
      data: apt,
      disabled: apt.status === 'cancelled' || apt.status === 'completed',
    });

    // Aplicar transform durante drag para feedback visual
    const style = {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: getStatusBgColor(apt.status),
      minHeight: '40px',
      transform: CSS.Translate.toString(transform),
      transition: isDragging ? 'none' : 'transform 0.2s ease',
    };

    const isDisabled = apt.status === 'cancelled' || apt.status === 'completed';
    
    // Item 3: Pegar todos os serviços (não só o primeiro)
    const serviceNames = apt.appointment_services?.map(as => as.services?.name).filter(Boolean) || [];
    const servicesText = serviceNames.join(' • '); // Separar com bullet

    const handleCardClick = (e: React.MouseEvent) => {
      // Em mobile, abrir sheet ao invés de context menu
      if (isMobile && !isDisabled && !isDragging) {
        e.preventDefault();
        e.stopPropagation();
        setMobileMenuAppointment(apt);
        setShowMobileMenu(true);
      }
    };

    return (
      <ContextMenu>
        <ContextMenuTrigger disabled={isDisabled}>
          <div
            ref={setNodeRef}
            style={style}
            {...(!isDisabled ? listeners : {})}
            {...(!isDisabled ? attributes : {})}
            onClick={handleCardClick}
            className={`absolute left-2 right-2 rounded-lg px-2 py-1 text-white overflow-hidden shadow-md z-10 ${
              !isDisabled ? 'cursor-move' : 'cursor-default'
            } hover:brightness-110 transition-all ${
              !isDisabled && !isMobile ? 'touch-none' : ''
            } ${
              isDragging ? 'opacity-50 ring-2 ring-primary scale-105' : ''
            }`}
          >
            {isDragging ? (
              // Durante drag: apenas horário centralizado
              <div className="flex items-center justify-center h-full">
                <div className="text-base font-bold">
                  {draggedTime || apt.appointment_time}
                </div>
              </div>
            ) : (
              // Item 3: Estado normal - sempre mostrar todas as informações SEM cortar texto
              <div className="space-y-0.5">
                {/* Linha 1: Horário + Cliente */}
                <div className="text-xs font-semibold line-clamp-1">
                  {apt.appointment_time} - {apt.profiles?.full_name}
                </div>
                
                {/* Linha 2: Serviço(s) */}
                {servicesText && (
                  <div className="text-[10px] opacity-90 line-clamp-2">
                    {servicesText}
                  </div>
                )}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
            <>
              <ContextMenuItem onClick={() => handleReadyForService(apt.id)}>
                ✓ Avisar que está pronto
              </ContextMenuItem>
              <ContextMenuItem onClick={() => openRescheduleDialog(apt)}>
                📅 Alterar
              </ContextMenuItem>
              <ContextMenuItem onClick={() => openCancelDialog(apt.id)} className="text-destructive">
                ✕ Cancelar
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  const renderDayView = () => {
    const timezone = 'America/Sao_Paulo';
    const zonedDate = toZonedTime(selectedDate, timezone);
    const dateStr = format(zonedDate, 'yyyy-MM-dd');
    const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled');
    
    // Verificar se a data selecionada é hoje
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(toZonedTime(new Date(), timezone), 'yyyy-MM-dd');
    
    // Mapear dias da semana em inglês para português
    const dayOfWeekMap: { [key: string]: string } = {
      'sunday': 'sunday',
      'monday': 'monday',
      'tuesday': 'tuesday',
      'wednesday': 'wednesday',
      'thursday': 'thursday',
      'friday': 'friday',
      'saturday': 'saturday'
    };
    
    const dayOfWeekEn = format(selectedDate, 'EEEE').toLowerCase();
    const dayOfWeek = dayOfWeekMap[dayOfWeekEn] || 'monday';
    
    // Calcular posição da linha vermelha (hora atual)
    let currentTimePosition = 0;
    if (isToday) {
      const now = toZonedTime(currentTime, timezone);
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      currentTimePosition = (currentHour * 64) + (currentMinutes * 64 / 60);
    }

    return (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Item 6 & Layout: Grid flush com extremidades da tela no mobile */}
          <div className={`relative overflow-hidden ${isMobile ? '-mx-4' : ''}`}>
          <div className="grid grid-cols-[60px_1fr]">
            {/* Coluna de horários */}
            <div className="bg-muted/50 border-r">
              {hours.map(hour => (
                <div key={hour} className="relative h-16 border-b">
                  <div className="flex flex-col items-center justify-start pt-1 text-xs text-muted-foreground">
                    <span>{hour.toString().padStart(2, '0')}:00</span>
                  </div>
                  <div className="absolute top-1/4 left-0 right-0 flex justify-center">
                    <span className="text-[10px] text-muted-foreground/60">:15</span>
                  </div>
                  <div className="absolute top-1/2 left-0 right-0 flex justify-center">
                    <span className="text-[10px] text-muted-foreground/60">:30</span>
                  </div>
                  <div className="absolute top-3/4 left-0 right-0 flex justify-center">
                    <span className="text-[10px] text-muted-foreground/60">:45</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Área de agendamentos */}
            <div className="relative">
              {/* Linhas de hora e subdivisões de 15 minutos */}
              {hours.map(hour => {
                const isInactive = isHourInactive(hour, dayOfWeek);
                return (
                  <div key={hour} className="relative h-16 border-b">
                    {/* Overlay para horário inativo com padrão de riscos */}
                    {isInactive && (
                      <div 
                        className="absolute inset-0 bg-muted/30 z-5"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)'
                        }}
                      />
                    )}
                    {/* Linhas tracejadas para 15, 30 e 45 minutos */}
                    <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-muted-foreground/20" />
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-muted-foreground/20" />
                    <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-muted-foreground/20" />
                  </div>
                );
              })}
              
              {/* Linha vermelha do horário atual */}
              {isToday && currentTimePosition >= 0 && currentTimePosition <= (24 * 64) && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                </div>
              )}
              
              {/* Agendamentos posicionados com Drag & Drop */}
              {dayAppointments.map(apt => {
                const [hour, minute] = apt.appointment_time.split(':').map(Number);
                const [endHour, endMinute] = apt.end_time.split(':').map(Number);
                
                const startMinutes = hour * 60 + minute;
                const endMinutes = endHour * 60 + endMinute;
                const duration = endMinutes - startMinutes;
                
                const top = (startMinutes / 60) * 64;
                const height = (duration / 60) * 64;

                return (
                  <DraggableAppointmentCard
                    key={apt.id}
                    apt={apt}
                    top={top}
                    height={height}
                    isDragging={activeId === apt.id}
                    draggedTime={draggedTime}
                    getStatusBgColor={getStatusBgColor}
                    handleReadyForService={handleReadyForService}
                    openRescheduleDialog={openRescheduleDialog}
                    openCancelDialog={openCancelDialog}
                  />
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </DndContext>
    );
  };

  const renderWeekView = () => {
    const timezone = 'America/Sao_Paulo';
    const zonedDate = toZonedTime(selectedDate, timezone);
    const weekStart = startOfWeek(zonedDate, { locale: ptBR });
    const weekEnd = endOfWeek(zonedDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">
            {format(weekStart, "d", { locale: ptBR })} - {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled');
            const isToday = isSameDay(day, new Date());

            return (
              <Card key={dateStr} className={isToday ? 'border-primary' : ''}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm text-center">
                    {format(day, 'EEE', { locale: ptBR })}
                    <div className="text-lg">{format(day, 'd')}</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div key={apt.id} className="text-xs p-1 rounded" style={{ backgroundColor: getStatusBgColor(apt.status) + '20' }}>
                      <div className="font-medium truncate">{apt.appointment_time}</div>
                      <div className="truncate text-muted-foreground">{apt.profiles?.full_name}</div>
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard/business")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao Dashboard
      </Button>

      <Card>
        {/* Item 7: Esconder título em mobile */}
        <CardHeader className="hidden sm:block">
          <CardTitle className="text-2xl font-bold">Calendário de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Item 7: Tabs de visualização - apenas desktop - Se mobile, mostrar só dia */}
          {isMobile ? (
            renderDayView()
          ) : (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>

              <TabsContent value="day">
                {renderDayView()}
              </TabsContent>

              <TabsContent value="week">
                {renderWeekView()}
              </TabsContent>

              <TabsContent value="month">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[200px] text-center font-medium">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grade de dias do mês */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, idx) => {
                    const dayAppointments = getAppointmentsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={idx}
                        className={`min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                          !isCurrentMonth ? 'bg-muted/50 text-muted-foreground' : 'bg-background'
                        } ${isToday ? 'border-primary border-2' : ''}`}
                        onClick={() => {
                          setSelectedDate(day);
                          setViewMode('day');
                        }}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 3).map((apt) => (
                            <div
                              key={apt.id}
                              className={`text-xs p-1 rounded border ${getStatusColor(apt.status)}`}
                            >
                              <div className="font-medium">{apt.appointment_time}</div>
                              <div className="truncate">{apt.profiles?.full_name}</div>
                            </div>
                          ))}
                          {dayAppointments.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayAppointments.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-yellow-100 border-yellow-300"></div>
                    <span className="text-sm">Pendente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-green-100 border-green-300"></div>
                    <span className="text-sm">Confirmado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-blue-100 border-blue-300"></div>
                    <span className="text-sm">Concluído</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border bg-red-100 border-red-300"></div>
                    <span className="text-sm">Cancelado</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

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

      {selectedAppointment && businessId && (
        <RescheduleDialog
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          appointmentId={selectedAppointment.id}
          businessId={businessId}
          currentDate={selectedAppointment.appointment_date}
          currentTime={selectedAppointment.appointment_time}
          currentServiceId={selectedAppointment.appointment_services?.[0]?.services?.id || ''}
          onRescheduleSuccess={() => {
            setShowRescheduleDialog(false);
            fetchAppointments();
          }}
        />
      )}

      {/* Mobile Menu Sheet */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Opções do Agendamento</SheetTitle>
          </SheetHeader>
          {mobileMenuAppointment && (
            <div className="space-y-2 pt-4">
              <div className="pb-4 border-b">
                <p className="font-semibold">{mobileMenuAppointment.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {mobileMenuAppointment.appointment_time}
                  {mobileMenuAppointment.appointment_services?.[0]?.services && 
                    ` - ${mobileMenuAppointment.appointment_services[0].services.name}`
                  }
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  handleReadyForService(mobileMenuAppointment.id);
                  setShowMobileMenu(false);
                }}
              >
                ✓ Avisar que está pronto
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  openRescheduleDialog(mobileMenuAppointment);
                  setShowMobileMenu(false);
                }}
              >
                📅 Alterar
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => {
                  openCancelDialog(mobileMenuAppointment.id);
                  setShowMobileMenu(false);
                }}
              >
                ✕ Cancelar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
