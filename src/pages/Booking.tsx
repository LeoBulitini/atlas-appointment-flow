import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MapPin, Phone, Mail, Clock, DollarSign } from "lucide-react";
import { format, parse, addMinutes, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
}

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  price_range: string;
  opening_hours: any;
}

interface PortfolioItem {
  media_type: string;
  media_data: string;
}

const Booking = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (businessId) {
      fetchBusinessAndServices();
    }
  }, [businessId]);

  useEffect(() => {
    if (selectedDate && business) {
      generateAvailableSlots();
    }
  }, [selectedDate, business, bookedSlots]);

  const fetchBusinessAndServices = async () => {
    try {
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("is_active", true)
        .single();

      if (businessError) throw businessError;
      setBusiness(businessData);

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      const { data: portfolioData } = await supabase
        .from("business_portfolio")
        .select("media_type, media_data")
        .eq("business_id", businessId)
        .order("display_order", { ascending: true });

      setPortfolio(portfolioData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = async () => {
    if (!selectedDate || !business?.opening_hours) return;

    const dayName = format(selectedDate, 'EEEE', { locale: ptBR }).toLowerCase();
    const englishDays: { [key: string]: string } = {
      'domingo': 'sunday',
      'segunda-feira': 'monday',
      'terça-feira': 'tuesday',
      'quarta-feira': 'wednesday',
      'quinta-feira': 'thursday',
      'sexta-feira': 'friday',
      'sábado': 'saturday'
    };
    
    const dayKey = englishDays[dayName];
    const daySchedule = business.opening_hours[dayKey];

    if (!daySchedule || !daySchedule.isOpen) {
      setAvailableSlots([]);
      return;
    }

    // Fetch booked appointments for this date
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time, end_time")
      .eq("business_id", businessId)
      .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"]);

    const booked: string[] = [];
    appointments?.forEach(apt => {
      if (apt.appointment_time && apt.end_time) {
        const startTime = parse(apt.appointment_time, "HH:mm", new Date());
        const endTime = parse(apt.end_time, "HH:mm", new Date());
        let current = startTime;
        while (current < endTime) {
          booked.push(format(current, "HH:mm"));
          current = addMinutes(current, 15);
        }
      }
    });
    setBookedSlots(booked);

    // Generate 15-minute slots
    const slots: string[] = [];
    const openTime = parse(daySchedule.openTime, "HH:mm", new Date());
    const closeTime = parse(daySchedule.closeTime, "HH:mm", new Date());
    let currentSlot = openTime;

    while (currentSlot < closeTime) {
      const slotTime = format(currentSlot, "HH:mm");
      
      // Check if slot is in break time
      const isBreak = daySchedule.breaks?.some((br: any) => {
        const breakStart = parse(br.start, "HH:mm", new Date());
        const breakEnd = parse(br.end, "HH:mm", new Date());
        return currentSlot >= breakStart && currentSlot < breakEnd;
      });

      // Check if slot is in the past
      const isPast = isToday(selectedDate) && isBefore(
        parse(slotTime, "HH:mm", new Date()),
        new Date()
      );

      if (!isBreak && !booked.includes(slotTime) && !isPast) {
        slots.push(slotTime);
      }
      
      currentSlot = addMinutes(currentSlot, 15);
    }

    setAvailableSlots(slots);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.duration_minutes || 0);
    }, 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedServices.length === 0 || !selectedDate || !selectedTime) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione ao menos um serviço, data e horário",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Atenção",
          description: "Você precisa estar logado para fazer um agendamento",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const totalDuration = getTotalDuration();
      const startTime = parse(selectedTime, "HH:mm", new Date());
      const endTime = addMinutes(startTime, totalDuration);

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          business_id: businessId,
          service_id: selectedServices[0], // Primary service for compatibility
          client_id: user.id,
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          end_time: format(endTime, "HH:mm"),
          notes,
          status: "pending",
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Insert all selected services
      const serviceInserts = selectedServices.map(serviceId => ({
        appointment_id: appointmentData.id,
        service_id: serviceId
      }));

      const { error: servicesError } = await supabase
        .from("appointment_services")
        .insert(serviceInserts);

      if (servicesError) throw servicesError;

      toast({
        title: "Sucesso!",
        description: "Agendamento realizado com sucesso",
      });

      navigate("/dashboard/client");
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-lg text-muted-foreground">Empresa não encontrada</p>
              <Button onClick={() => navigate("/")} className="mt-4">
                Voltar para Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalDuration = getTotalDuration();
  const totalPrice = getTotalPrice();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Business Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{business.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary">{business.category}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {business.description && (
                  <p className="text-sm text-muted-foreground">{business.description}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>{business.address}, {business.city} - {business.state}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{business.phone}</span>
                  </div>
                  
                  {business.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{business.email}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Faixa de preço: {business.price_range}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {portfolio.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfólio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {portfolio.slice(0, 4).map((item, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        {item.media_type === 'image' ? (
                          <img src={item.media_data} alt="Portfolio" className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.media_data} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Agendar Serviço</CardTitle>
                <CardDescription>
                  Selecione os serviços, data e horário desejados
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Service Selection */}
                  <div className="space-y-2">
                    <Label>Serviços *</Label>
                    <div className="grid gap-3">
                      {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum serviço disponível no momento
                        </p>
                      ) : (
                        services.map((service) => (
                          <Card
                            key={service.id}
                            className={`cursor-pointer transition-smooth ${
                              selectedServices.includes(service.id)
                                ? "ring-2 ring-primary"
                                : "hover:shadow-md"
                            }`}
                            onClick={() => handleServiceToggle(service.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedServices.includes(service.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-semibold">{service.name}</h4>
                                      {service.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {service.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>{service.duration_minutes} min</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-primary">
                                        R$ {service.price.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                    {selectedServices.length > 0 && (
                      <div className="p-4 bg-accent rounded-lg">
                        <p className="font-semibold">Total: R$ {totalPrice.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Duração: {totalDuration} minutos</p>
                      </div>
                    )}
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2">
                    <Label>Horário * (Intervalos de 15 minutos)</Label>
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground">Selecione uma data primeiro</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível para esta data</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {availableSlots.map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant={selectedTime === time ? "default" : "outline"}
                            onClick={() => setSelectedTime(time)}
                            className="w-full"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma observação ou preferência especial..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      "Confirmar Agendamento"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
