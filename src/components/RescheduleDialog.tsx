import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, parse, addMinutes, isBefore, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  businessId: string;
  currentDate: string;
  currentTime: string;
  currentServiceId: string;
  onRescheduleSuccess: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  appointmentId,
  businessId,
  currentDate,
  currentTime,
  currentServiceId,
  onRescheduleSuccess,
}: RescheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([currentServiceId]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(currentDate));
  const [selectedTime, setSelectedTime] = useState(currentTime);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchBusiness();
    }
  }, [open, businessId]);

  useEffect(() => {
    if (selectedDate && business) {
      generateAvailableSlots();
    }
  }, [selectedDate, business, selectedServices]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true);
    setServices(data || []);
  };

  const fetchBusiness = async () => {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    setBusiness(data);
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

    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time, end_time, status, id")
      .eq("business_id", businessId)
      .eq("appointment_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"])
      .neq("id", appointmentId); // Exclude current appointment

    const booked: string[] = [];
    appointments?.forEach(apt => {
      if (apt.appointment_time && apt.end_time) {
        const timeFormat = apt.appointment_time.includes(':') && apt.appointment_time.split(':').length === 3 ? "HH:mm:ss" : "HH:mm";
        const endTimeFormat = apt.end_time.includes(':') && apt.end_time.split(':').length === 3 ? "HH:mm:ss" : "HH:mm";
        
        const startTime = parse(apt.appointment_time, timeFormat, new Date());
        const endTime = parse(apt.end_time, endTimeFormat, new Date());
        
        let current = startTime;
        while (current < endTime) {
          booked.push(format(current, "HH:mm"));
          current = addMinutes(current, 15);
        }
      }
    });

    const totalDuration = selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.duration_minutes || 0);
    }, 0);

    const slots: string[] = [];
    const openTime = parse(daySchedule.openTime, "HH:mm", new Date());
    const closeTime = parse(daySchedule.closeTime, "HH:mm", new Date());
    let currentSlot = openTime;

    while (currentSlot < closeTime) {
      const slotTime = format(currentSlot, "HH:mm");
      
      const isBreak = daySchedule.breaks?.some((br: any) => {
        const breakStart = parse(br.start, "HH:mm", new Date());
        const breakEnd = parse(br.end, "HH:mm", new Date());
        return currentSlot >= breakStart && currentSlot < breakEnd;
      });

      const isPast = isToday(selectedDate) && isBefore(
        parse(slotTime, "HH:mm", new Date()),
        new Date()
      );

      let hasEnoughTime = true;
      if (totalDuration > 0) {
        let checkSlot = currentSlot;
        const endSlot = addMinutes(currentSlot, totalDuration);
        
        while (checkSlot < endSlot) {
          const checkTime = format(checkSlot, "HH:mm");
          
          if (booked.includes(checkTime)) {
            hasEnoughTime = false;
            break;
          }
          
          const isInBreak = daySchedule.breaks?.some((br: any) => {
            const breakStart = parse(br.start, "HH:mm", new Date());
            const breakEnd = parse(br.end, "HH:mm", new Date());
            return checkSlot >= breakStart && checkSlot < breakEnd;
          });
          
          if (isInBreak || checkSlot >= closeTime) {
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

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || selectedServices.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione data, horário e ao menos um serviço",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const totalDuration = selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.duration_minutes || 0);
      }, 0);

      const startTime = parse(selectedTime, "HH:mm", new Date());
      const endTime = addMinutes(startTime, totalDuration);

      // Update appointment
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          appointment_date: format(selectedDate, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          end_time: format(endTime, "HH:mm:ss"),
          service_id: selectedServices[0],
        })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      // Update services
      const { error: deleteError } = await supabase
        .from("appointment_services")
        .delete()
        .eq("appointment_id", appointmentId);

      if (deleteError) throw deleteError;

      const serviceInserts = selectedServices.map(serviceId => ({
        appointment_id: appointmentId,
        service_id: serviceId
      }));

      const { error: insertError } = await supabase
        .from("appointment_services")
        .insert(serviceInserts);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso!",
        description: "Agendamento alterado com sucesso",
      });

      onRescheduleSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">Serviços</Label>
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <label
                    htmlFor={`service-${service.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {service.name} - R$ {service.price.toFixed(2)} ({service.duration_minutes}min)
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Data</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              locale={ptBR}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          {availableSlots.length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Horário</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Alterando..." : "Confirmar Alteração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
