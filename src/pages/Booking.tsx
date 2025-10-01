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
import { Loader2, MapPin, Phone, Mail, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";
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
}

const Booking = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (businessId) {
      fetchBusinessAndServices();
    }
  }, [businessId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Atenção",
        description: "Por favor, preencha todos os campos obrigatórios",
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

      const { error } = await supabase.from("appointments").insert({
        business_id: businessId,
        service_id: selectedService,
        client_id: user.id,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
        notes,
        status: "pending",
      });

      if (error) throw error;

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

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Business Info */}
          <div className="lg:col-span-1">
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
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Agendar Serviço</CardTitle>
                <CardDescription>
                  Selecione o serviço, data e horário desejados
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Service Selection */}
                  <div className="space-y-2">
                    <Label>Serviço *</Label>
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
                              selectedService === service.id
                                ? "ring-2 ring-primary"
                                : "hover:shadow-md"
                            }`}
                            onClick={() => setSelectedService(service.id)}
                          >
                            <CardContent className="p-4">
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
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
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
                    <Label>Horário *</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((time) => (
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
