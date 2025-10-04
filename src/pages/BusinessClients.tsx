import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Calendar as CalendarIcon, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  client_id: string;
  first_appointment_date: string;
  last_appointment_date: string;
  total_appointments: number;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: {
    name: string;
  };
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Business {
  id: string;
  auto_confirm_appointments: boolean;
  opening_hours: any;
}

export default function BusinessClients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingClient, setBookingClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchBusinessAndServices();
  }, []);

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!businessData) return;

    const { data: clientsData } = await supabase
      .from("business_clients")
      .select(`
        *,
        profiles (
          full_name,
          phone
        )
      `)
      .eq("business_id", businessData.id)
      .order("last_appointment_date", { ascending: false });

    if (clientsData) {
      setClients(clientsData);
    }
    setLoading(false);
  };

  const fetchClientAppointments = async (clientId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!businessData) return;

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        appointment_services (
          services (
            name
          )
        )
      `)
      .eq("business_id", businessData.id)
      .eq("client_id", clientId)
      .order("appointment_date", { ascending: false });

    if (appointmentsData) {
      setAppointments(appointmentsData.map(apt => ({
        ...apt,
        services: apt.appointment_services?.[0]?.services || { name: 'Serviço não especificado' }
      })));
    }
    setSelectedClient(clientId);
  };

  const fetchBusinessAndServices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, auto_confirm_appointments, opening_hours")
      .eq("owner_id", user.id)
      .single();

    if (businessData) {
      setBusiness(businessData);
      
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price")
        .eq("business_id", businessData.id)
        .eq("is_active", true);
      
      if (servicesData) {
        setServices(servicesData);
      }
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.full_name || !newClientData.phone || !newClientData.email || !newClientData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para criar um cliente.",
        variant: "destructive",
      });
      return;
    }

    setCreatingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client-by-business', {
        body: newClientData
      });

      if (error) throw error;

      toast({
        title: "Cliente criado!",
        description: `Cliente ${newClientData.full_name} foi criado com sucesso.`,
      });

      setCreateClientDialogOpen(false);
      setNewClientData({ full_name: "", phone: "", email: "", password: "" });
      fetchClients();
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o cliente.",
        variant: "destructive",
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const openBookingDialog = (client: Client) => {
    setBookingClient(client);
    setSelectedService("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
    setBookingDialogOpen(true);
  };

  const getAvailableTimes = () => {
    if (!selectedDate || !business?.opening_hours) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const hours = business.opening_hours[dayName];
    
    if (!hours || !hours.isOpen) return [];
    
    const times: string[] = [];
    const [startHour, startMinute] = hours.openTime.split(':').map(Number);
    const [endHour, endMinute] = hours.closeTime.split(':').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === startHour && minute < startMinute) continue;
        if (hour === endHour - 1 && minute >= endMinute) break;
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    
    return times;
  };

  const handleBookAppointment = async () => {
    if (!bookingClient || !selectedService || !selectedDate || !selectedTime || !business) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);

    try {
      const service = services.find(s => s.id === selectedService);
      if (!service) throw new Error("Serviço não encontrado");

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endTime = new Date(0, 0, 0, hours, minutes + service.duration_minutes);
      const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

      const { data, error } = await supabase.rpc('create_appointment_if_available', {
        p_business_id: business.id,
        p_service_id: selectedService,
        p_client_id: bookingClient.client_id,
        p_appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        p_appointment_time: selectedTime,
        p_end_time: endTimeString,
        p_notes: notes || null,
        p_auto_confirm: business.auto_confirm_appointments
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; appointment_id?: string };
      
      if (result && !result.success) {
        toast({
          title: "Horário indisponível",
          description: result.message || "Este horário já está ocupado.",
          variant: "destructive",
        });
        return;
      }

      // Criar registro em appointment_services para vincular o serviço
      if (result.appointment_id) {
        const { error: serviceError } = await supabase
          .from('appointment_services')
          .insert({
            appointment_id: result.appointment_id,
            service_id: selectedService
          });

        if (serviceError) {
          console.error("Erro ao vincular serviço:", serviceError);
        }

        // Enviar email de confirmação
        try {
          await supabase.functions.invoke('send-appointment-email', {
            body: {
              appointmentId: result.appointment_id,
              type: 'new_appointment'
            }
          });
        } catch (emailError) {
          console.error("Erro ao enviar email:", emailError);
          // Não bloqueia o agendamento se o email falhar
        }
      }

      toast({
        title: "Agendamento criado!",
        description: `Agendamento para ${bookingClient.profiles.full_name} criado com sucesso.`,
      });

      setBookingDialogOpen(false);
      fetchClients();
      if (selectedClient) {
        fetchClientAppointments(selectedClient);
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/dashboard/business")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Meus Clientes</h1>
          <Dialog open={createClientDialogOpen} onOpenChange={setCreateClientDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome Completo *</Label>
                  <Input
                    id="client-name"
                    value={newClientData.full_name}
                    onChange={(e) => setNewClientData({ ...newClientData, full_name: e.target.value })}
                    placeholder="Nome do cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone *</Label>
                  <Input
                    id="client-phone"
                    value={newClientData.phone}
                    onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail *</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Senha *</Label>
                  <Input
                    id="client-password"
                    type="password"
                    value={newClientData.password}
                    onChange={(e) => setNewClientData({ ...newClientData, password: e.target.value })}
                    placeholder="Senha de acesso"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCreateClientDialogOpen(false)}
                    disabled={creatingClient}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateClient}
                    disabled={creatingClient}
                  >
                    {creatingClient ? "Criando..." : "Criar Cliente"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum cliente ainda. Quando alguém agendar, aparecerá aqui!
                </p>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted hover:text-foreground ${
                      selectedClient === client.client_id ? 'bg-muted' : ''
                    }`}
                    onClick={() => fetchClientAppointments(client.client_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{client.profiles.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {client.total_appointments} agendamento{client.total_appointments !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Último agendamento:{' '}
                          {format(new Date(client.last_appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBookingDialog(client);
                          }}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Agendar
                        </Button>
                        {client.profiles.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(client.profiles.phone);
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedClient ? (
                <p className="text-muted-foreground text-center py-8">
                  Selecione um cliente para ver o histórico
                </p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum agendamento encontrado
                </p>
              ) : (
                appointments.map((appointment) => (
                  <div key={appointment.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{appointment.services.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {' às '}
                          {appointment.appointment_time}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {appointment.status === 'completed'
                          ? 'Concluído'
                          : appointment.status === 'confirmed'
                          ? 'Confirmado'
                          : appointment.status === 'cancelled'
                          ? 'Cancelado'
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Agendar para {bookingClient?.profiles.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="service">Serviço *</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger id="service">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)} ({service.duration_minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate}>
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTimes().map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o agendamento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBookingDialogOpen(false)}
                  disabled={bookingLoading}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleBookAppointment}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
