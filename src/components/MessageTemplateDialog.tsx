import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Copy, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  getAvailableSlots,
  getUpcomingAppointments,
  getActiveServices,
  fillTemplate,
  formatDuration,
  formatPrice,
  type AvailableSlot,
  type AppointmentData,
  type ServiceData,
} from "@/lib/marketing-utils";
import { toast } from "sonner";

interface MessageTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    title: string;
    message: string;
    fields: string[];
  };
  businessId: string;
  onCopy: (message: string) => void;
  onWhatsApp: (message: string) => void;
}

export function MessageTemplateDialog({
  open,
  onOpenChange,
  template,
  businessId,
  onCopy,
  onWhatsApp,
}: MessageTemplateDialogProps) {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>();

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      setFormData({});
      setSelectedDate(undefined);
    }
  }, [open, businessId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [slots, upcomingAppts, activeServices] = await Promise.all([
        getAvailableSlots(businessId, 7),
        getUpcomingAppointments(businessId),
        getActiveServices(businessId),
      ]);
      setAvailableSlots(slots);
      setAppointments(upcomingAppts);
      setServices(activeServices);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const needsServiceSelection = template.fields.some((f) =>
    ["[SERVIÇO]", "[NOVO SERVIÇO]", "[VALOR]", "[TEMPO]"].includes(f)
  );

  const needsAppointmentSelection = template.id === "lembrete-agendamento";

  const needsTimeSlots = ["vagas-hoje", "horarios-semana"].includes(template.id);

  const needsPromoDescription = template.fields.includes("[DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]");

  const needsDateSelection = template.fields.includes("[DATA]") && !needsAppointmentSelection;

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setFormData({
        ...formData,
        "[SERVIÇO]": service.name,
        "[NOVO SERVIÇO]": service.name,
        "[VALOR]": formatPrice(service.price),
        "[TEMPO]": formatDuration(service.duration_minutes),
      });
    }
  };

  const handleAppointmentChange = (appointmentId: string) => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (appointment) {
      const [hour, minute] = appointment.time.split(":");
      setFormData({
        ...formData,
        "[DATA]": format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR }),
        "[HORA]": `${hour}:${minute}`,
        "[SERVIÇO]": appointment.service_name,
      });
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setFormData({
        ...formData,
        "[DATA]": format(date, "dd/MM/yyyy", { locale: ptBR }),
      });
    }
  };

  const autoFillTimeSlots = () => {
    if (template.id === "vagas-hoje") {
      const todaySlots = availableSlots.filter((slot) => {
        const today = format(new Date(), "yyyy-MM-dd");
        return slot.date === today;
      });

      if (todaySlots.length >= 3) {
        return {
          "[X]": todaySlots.length.toString(),
          "[HORÁRIO 1]": todaySlots[0].displayTime,
          "[HORÁRIO 2]": todaySlots[1].displayTime,
          "[HORÁRIO 3]": todaySlots[2].displayTime,
        };
      } else if (todaySlots.length > 0) {
        const data: Record<string, string> = {
          "[X]": todaySlots.length.toString(),
        };
        todaySlots.forEach((slot, index) => {
          data[`[HORÁRIO ${index + 1}]`] = slot.displayTime;
        });
        return data;
      }
    }

    if (template.id === "horarios-semana") {
      // Agrupar slots por dia da semana
      const slotsByDay: Record<string, string[]> = {};
      const weekDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
      
      availableSlots.forEach((slot) => {
        const date = new Date(slot.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayName = weekDays[dayOfWeek - 1];
          if (!slotsByDay[dayName]) slotsByDay[dayName] = [];
          if (slotsByDay[dayName].length < 3) {
            slotsByDay[dayName].push(slot.displayTime);
          }
        }
      });

      return {
        "[HORÁRIOS]": Object.entries(slotsByDay)
          .map(([day, times]) => `${day}: ${times.join(", ")}`)
          .join("\n"),
      };
    }

    return {};
  };

  const getFinalMessage = (): string => {
    let data = { ...formData };

    // Auto-fill time slots if needed
    if (needsTimeSlots) {
      data = { ...data, ...autoFillTimeSlots() };
    }

    return fillTemplate(template.message, data);
  };

  const canSubmit = () => {
    if (loading) return false;

    if (needsServiceSelection) {
      return !!formData["[SERVIÇO]"] || !!formData["[NOVO SERVIÇO]"];
    }

    if (needsAppointmentSelection) {
      return !!formData["[DATA]"] && !!formData["[HORA]"];
    }

    if (needsPromoDescription) {
      return !!formData["[DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]"];
    }

    if (needsDateSelection) {
      return !!formData["[DATA]"];
    }

    return true;
  };

  const handleCopy = () => {
    const message = getFinalMessage();
    onCopy(message);
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const message = getFinalMessage();
    onWhatsApp(message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>
            Preencha as informações necessárias para personalizar a mensagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {needsAppointmentSelection && (
                <div className="space-y-2">
                  <Label>Selecione o agendamento</Label>
                  <Select onValueChange={handleAppointmentChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um agendamento futuro" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.client_name} - {format(new Date(apt.date), "dd/MM", { locale: ptBR })} às{" "}
                          {apt.time.substring(0, 5)} - {apt.service_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsServiceSelection && (
                <div className="space-y-2">
                  <Label>Selecione o serviço</Label>
                  <Select onValueChange={handleServiceChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {formatPrice(service.price)} ({formatDuration(service.duration_minutes)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsPromoDescription && (
                <div className="space-y-2">
                  <Label>Descrição da promoção/novidade</Label>
                  <Textarea
                    placeholder="Ex: 20% de desconto em todos os cortes de cabelo"
                    value={formData["[DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]"] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        "[DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]": e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
              )}

              {needsDateSelection && (
                <div className="space-y-2">
                  <Label>Data de validade</Label>
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
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateChange}
                        initialFocus
                        className="pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {needsTimeSlots && availableSlots.length === 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">
                    Não há horários disponíveis no momento. Certifique-se de que seu horário de funcionamento está configurado.
                  </p>
                </div>
              )}

              {/* Preview da mensagem */}
              <div className="space-y-2">
                <Label>Prévia da mensagem</Label>
                <div className="p-4 bg-muted rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">{getFinalMessage()}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleCopy} disabled={!canSubmit()} className="flex-1">
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button onClick={handleWhatsApp} disabled={!canSubmit()} className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
