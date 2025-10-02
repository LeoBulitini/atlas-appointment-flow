import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function BusinessClients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
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

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
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

        <h1 className="text-3xl font-bold mb-6">Meus Clientes</h1>

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
                    <div className="flex items-start justify-between">
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
      </div>
    </div>
  );
}
