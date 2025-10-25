import { useEffect, useState } from "react";
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

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  end_time: string;
  status: string;
  profiles: { full_name: string };
  appointment_services: Array<{
    services: { name: string };
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

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchAppointments();
    }
  }, [businessId, currentMonth]);

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
            services(name)
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

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return appointments.filter(apt => apt.appointment_date === dateStr);
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

  const renderDayView = () => {
    const timezone = 'America/Sao_Paulo';
    const zonedDate = toZonedTime(selectedDate, timezone);
    const dateStr = format(zonedDate, 'yyyy-MM-dd');
    const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
    
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0h às 23h
    
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

        <div className="relative border rounded-lg overflow-hidden">
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
              
              {/* Agendamentos posicionados */}
              {dayAppointments.map(apt => {
                const [hour, minute] = apt.appointment_time.split(':').map(Number);
                const [endHour, endMinute] = apt.end_time.split(':').map(Number);
                
                const startMinutes = hour * 60 + minute;
                const endMinutes = endHour * 60 + endMinute;
                const duration = endMinutes - startMinutes;
                
                const top = (startMinutes / 60) * 64; // 64px = altura de cada hora
                const height = (duration / 60) * 64;

                return (
                  <div
                    key={apt.id}
                    className="absolute left-2 right-2 rounded-lg p-2 text-white overflow-hidden shadow-md z-10"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: getStatusBgColor(apt.status),
                      minHeight: '40px'
                    }}
                  >
                    <div className="text-sm font-medium truncate">
                      {apt.appointment_time} - {apt.profiles?.full_name}
                    </div>
                    {apt.appointment_services?.[0]?.services && (
                      <div className="text-xs truncate opacity-90">
                        {apt.appointment_services[0].services.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
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
            const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate("/dashboard/business")} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar ao Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Calendário de Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} mb-4`}>
              <TabsTrigger value="day">Dia</TabsTrigger>
              {!isMobile && <TabsTrigger value="week">Semana</TabsTrigger>}
              {!isMobile && <TabsTrigger value="month">Mês</TabsTrigger>}
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
        </CardContent>
      </Card>
    </div>
  );
}
