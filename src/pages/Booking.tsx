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
import { Loader2, MapPin, Phone, Mail, Clock, DollarSign, MessageCircle, X } from "lucide-react";
import { format, parse, addMinutes, isBefore, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReviewsList } from "@/components/ReviewsList";

interface ReviewsSectionProps {
  businessId: string;
}

const ReviewsSection = ({ businessId }: ReviewsSectionProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [businessId]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles(full_name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setReviews(data);
      
      // Fetch all reviews for average
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("business_id", businessId);
      
      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        setAverageRating(Number(avg.toFixed(1)));
      }
    }
  };

  if (reviews.length === 0 && averageRating === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Avaliações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Ainda não há avaliações para este estabelecimento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestReview = reviews[0];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Avaliações</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{averageRating}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestReview && (
            <div className="border-l-2 border-primary pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{latestReview.profiles?.full_name}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= latestReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {latestReview.comment && (
                <p className="text-sm text-muted-foreground">{latestReview.comment}</p>
              )}
            </div>
          )}
          <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Ver Todas as Avaliações
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Todas as Avaliações</DialogTitle>
              </DialogHeader>
              <ReviewsList businessId={businessId} />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
};

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
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
  auto_confirm_appointments?: boolean;
  payment_methods?: string[];
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
  const [showAllPortfolio, setShowAllPortfolio] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchBusinessAndServices();
    }
  }, [businessId]);

  useEffect(() => {
    if (selectedDate && business) {
      generateAvailableSlots();
    }
  }, [selectedDate, business, selectedServices]);

  // Real-time updates: refresh available slots when new appointments are made
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          // Reload available slots when someone books
          if (selectedDate && business) {
            generateAvailableSlots();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, selectedDate, business]);

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
        .eq("is_active", true)
        .eq("is_public", true);

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

    // Check for special hours first
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: specialHours } = await supabase
      .from("business_special_hours")
      .select("*")
      .eq("business_id", businessId)
      .eq("date", dateStr)
      .single();

    // If the business is closed on this specific day
    if (specialHours?.is_closed) {
      setAvailableSlots([]);
      return;
    }

    // Determine the schedule to use (special hours or regular hours)
    let daySchedule;
    
    if (specialHours && !specialHours.is_closed) {
      // Use special hours for this date
      daySchedule = {
        isOpen: true,
        openTime: specialHours.open_time,
        closeTime: specialHours.close_time,
        breaks: specialHours.breaks || []
      };
    } else {
      // Use regular weekly schedule
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
      daySchedule = business.opening_hours[dayKey];
    }

    if (!daySchedule || !daySchedule.isOpen) {
      setAvailableSlots([]);
      return;
    }

    // Fetch booked appointments for this date
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time, end_time, status")
      .eq("business_id", businessId)
      .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"]);

    const booked: string[] = [];
    appointments?.forEach(apt => {
      if (apt.appointment_time && apt.end_time) {
        // O Supabase retorna time no formato HH:mm:ss, então precisamos detectar automaticamente
        const timeFormat = apt.appointment_time.includes(':') && apt.appointment_time.split(':').length === 3 ? "HH:mm:ss" : "HH:mm";
        const endTimeFormat = apt.end_time.includes(':') && apt.end_time.split(':').length === 3 ? "HH:mm:ss" : "HH:mm";
        
        const startTime = parse(apt.appointment_time, timeFormat, new Date());
        const endTime = parse(apt.end_time, endTimeFormat, new Date());
        
        // Marca todos os slots de 15 minutos entre o início e fim do agendamento como ocupados
        let current = startTime;
        while (current < endTime) {
          booked.push(format(current, "HH:mm"));
          current = addMinutes(current, 15);
        }
      }
    });
    
    console.log(`[${format(selectedDate, "dd/MM")}] Horários bloqueados:`, booked);
    setBookedSlots(booked);

    // Get total duration of selected services
    const totalDurationNeeded = getTotalDuration();

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

      // Check if there's enough consecutive time available for the selected services
      let hasEnoughTime = true;
      if (totalDurationNeeded > 0) {
        let checkSlot = currentSlot;
        const endSlot = addMinutes(currentSlot, totalDurationNeeded);
        
        // Verify all slots needed are available
        while (checkSlot < endSlot) {
          const checkTime = format(checkSlot, "HH:mm");
          
          // Check if this slot is booked
          if (booked.includes(checkTime)) {
            hasEnoughTime = false;
            break;
          }
          
          // Check if this slot is in break time
          const isInBreak = daySchedule.breaks?.some((br: any) => {
            const breakStart = parse(br.start, "HH:mm", new Date());
            const breakEnd = parse(br.end, "HH:mm", new Date());
            return checkSlot >= breakStart && checkSlot < breakEnd;
          });
          
          if (isInBreak) {
            hasEnoughTime = false;
            break;
          }
          
          // Check if this slot exceeds closing time
          if (checkSlot >= closeTime) {
            hasEnoughTime = false;
            break;
          }
          
          checkSlot = addMinutes(checkSlot, 15);
        }
      }

      if (!isBreak && !booked.includes(slotTime) && !isPast && hasEnoughTime) {
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

      // Use atomic function to create appointment with conflict checking
      const { data: result, error: rpcError } = await supabase
        .rpc('create_appointment_if_available', {
          p_business_id: businessId,
          p_service_id: selectedServices[0], // Primary service for compatibility
          p_client_id: user.id,
          p_appointment_date: format(selectedDate, "yyyy-MM-dd"),
          p_appointment_time: selectedTime,
          p_end_time: format(endTime, "HH:mm:ss"),
          p_notes: notes || null,
          p_auto_confirm: business.auto_confirm_appointments || false
        });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      // Check if appointment was successfully created
      const resultData = result as { success: boolean; error?: string; message?: string; appointment_id?: string };
      
      if (!resultData || !resultData.success) {
        if (resultData?.error === 'conflict') {
          toast({
            title: "Horário Indisponível",
            description: "Este horário acabou de ser reservado. Por favor, escolha outro horário.",
            variant: "destructive",
          });
          // Regenerate available slots
          generateAvailableSlots();
        } else {
          toast({
            title: "Erro",
            description: resultData?.message || "Erro ao criar agendamento",
            variant: "destructive",
          });
        }
        return;
      }

      // Insert all selected services first
      const serviceInserts = selectedServices.map(serviceId => ({
        appointment_id: resultData.appointment_id,
        service_id: serviceId
      }));

      const { error: servicesError } = await supabase
        .from("appointment_services")
        .insert(serviceInserts);

      if (servicesError) throw servicesError;

      // Send email notification (don't block on failure)
      supabase.functions
        .invoke('send-appointment-email', {
          body: {
            appointmentId: resultData.appointment_id,
            type: 'new_appointment'
          }
        })
        .then((emailResult) => {
          if (emailResult.error) {
            console.error('[Email] Error sending notification:', emailResult.error);
          } else {
            console.log('[Email] Notification sent successfully');
          }
        })
        .catch((err) => console.error('[Email] Failed to send notification:', err));

      toast({
        title: "Sucesso!",
        description: business.auto_confirm_appointments 
          ? "Agendamento confirmado automaticamente!"
          : "Agendamento realizado com sucesso",
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
                <Badge variant="secondary" className="mt-2">{business.category}</Badge>
                <CardDescription className="mt-2">
                  {business.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span>{business.address}, {business.city} - {business.state}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const address = encodeURIComponent(`${business.address}, ${business.city} - ${business.state}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Abrir no Maps
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formatPhoneNumber(business.phone)}</span>
                  </div>
                  
                  {business.phone && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        const phoneNumber = business.phone.replace(/\D/g, '');
                        const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre os serviços do ${business.name}.`);
                        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Conversar no WhatsApp
                    </Button>
                  )}
                  
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

                  {business.payment_methods && business.payment_methods.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <h4 className="font-semibold mb-2 text-sm">Formas de Pagamento:</h4>
                      <div className="flex flex-wrap gap-2">
                        {business.payment_methods.map((method) => (
                          <Badge key={method} variant="secondary" className="text-xs">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {business.opening_hours && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Horário de Funcionamento
                      </h4>
                      <div className="space-y-1 text-sm">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                          const dayNames: { [key: string]: string } = {
                            monday: 'Segunda',
                            tuesday: 'Terça',
                            wednesday: 'Quarta',
                            thursday: 'Quinta',
                            friday: 'Sexta',
                            saturday: 'Sábado',
                            sunday: 'Domingo'
                          };
                          const schedule = business.opening_hours[day];
                          if (!schedule) return null;
                          return (
                            <div key={day} className="flex justify-between">
                              <span className="text-muted-foreground">{dayNames[day]}:</span>
                              <span>
                                {schedule.isOpen 
                                  ? `${schedule.openTime} - ${schedule.closeTime}`
                                  : 'Fechado'
                                }
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                    {portfolio.slice(0, showAllPortfolio ? portfolio.length : 2).map((item, index) => (
                      <div 
                        key={index} 
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(item.media_data)}
                      >
                        {item.media_type === 'image' ? (
                          <img src={item.media_data} alt="Portfolio" className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.media_data} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                  {portfolio.length > 2 && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => setShowAllPortfolio(!showAllPortfolio)}
                    >
                      {showAllPortfolio ? 'Ver menos' : 'Ver mais'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Image Preview Dialog */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
              <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur-sm p-2 hover:bg-background transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                {selectedImage && (
                  <img 
                    src={selectedImage} 
                    alt="Portfolio ampliado" 
                    className="w-full h-auto max-h-[90vh] object-contain"
                  />
                )}
              </DialogContent>
            </Dialog>

            <ReviewsSection businessId={businessId!} />
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
                          <label
                            key={service.id}
                            className="block cursor-pointer"
                          >
                            <Card
                              className={`transition-smooth ${
                                selectedServices.includes(service.id)
                                  ? "ring-2 ring-primary"
                                  : "hover:shadow-md"
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={selectedServices.includes(service.id)}
                                    onCheckedChange={() => handleServiceToggle(service.id)}
                                  />
                                  {service.image_url && (
                                    <img src={service.image_url} alt={service.name} className="w-20 h-20 object-cover rounded-lg" />
                                  )}
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
                          </label>
                        ))
                      )}
                    </div>
                    {selectedServices.length > 0 && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="font-semibold text-foreground">Total: R$ {totalPrice.toFixed(2)}</p>
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
                      disabled={(date) => {
                        if (date < startOfDay(new Date())) return true;
                        if (!business?.opening_hours) return false;
                        
                        const dayName = format(date, 'EEEE', { locale: ptBR }).toLowerCase();
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
                        
                        return !daySchedule || !daySchedule.isOpen;
                      }}
                      locale={ptBR}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2">
                    <Label>Horário *</Label>
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
