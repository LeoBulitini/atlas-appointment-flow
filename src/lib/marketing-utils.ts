import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AvailableSlot {
  date: string;
  time: string;
  displayDate: string;
  displayTime: string;
}

export interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface AppointmentData {
  id: string;
  date: string;
  time: string;
  service_name: string;
  client_name: string;
}

/**
 * Busca os próximos horários disponíveis na agenda
 */
export async function getAvailableSlots(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AvailableSlot[]> {
  try {
    // Buscar horário de funcionamento do negócio
    const { data: business } = await supabase
      .from("businesses")
      .select("opening_hours")
      .eq("id", businessId)
      .single();

    if (!business?.opening_hours) {
      console.log("No opening hours configured");
      return [];
    }

    const openingHours = business.opening_hours as any;
    const now = new Date();
    const slots: AvailableSlot[] = [];

    // Definir período de busca
    const searchStartDate = startDate || now;
    const searchEndDate = endDate || addDays(searchStartDate, 7);
    const daysDiff = Math.ceil((searchEndDate.getTime() - searchStartDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Searching slots from ${format(searchStartDate, "yyyy-MM-dd")} to ${format(searchEndDate, "yyyy-MM-dd")}`);

    // Buscar todos os agendamentos confirmados/pendentes no período
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time, end_time, services!inner(duration_minutes)")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", format(searchStartDate, "yyyy-MM-dd"))
      .lte("appointment_date", format(searchEndDate, "yyyy-MM-dd"));

    console.log(`Found ${appointments?.length || 0} appointments`);

    // Mapear dias da semana
    const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Para cada dia no período
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = addDays(startOfDay(searchStartDate), i);
      const isToday = format(currentDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      const dayOfWeek = weekDays[currentDate.getDay()];
      const dayHours = openingHours[dayOfWeek];

      console.log(`Processing ${dayOfWeek} (${format(currentDate, "yyyy-MM-dd")}):`, dayHours);

      if (!dayHours || !dayHours.isOpen) {
        console.log(`${dayOfWeek} is closed`);
        continue;
      }

      // Gerar slots de 30 em 30 minutos
      const [openHour, openMinute] = dayHours.openTime.split(":").map(Number);
      const [closeHour, closeMinute] = dayHours.closeTime.split(":").map(Number);

      let currentTime = openHour * 60 + openMinute; // em minutos
      const closeTime = closeHour * 60 + closeMinute;

      // Se for hoje, começar do próximo horário disponível (mínimo 30 minutos a partir de agora)
      if (isToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const minTime = currentHour * 60 + currentMinute + 30; // 30 min de antecedência
        currentTime = Math.max(currentTime, Math.ceil(minTime / 30) * 30);
      }

      let slotsForDay = 0;
      while (currentTime < closeTime && slots.length < 20) {
        const hour = Math.floor(currentTime / 60);
        const minute = currentTime % 60;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

        // Verificar se este horário está ocupado
        const isOccupied = appointments?.some((apt: any) => {
          if (apt.appointment_date !== format(currentDate, "yyyy-MM-dd")) return false;
          
          const aptStart = apt.appointment_time;
          let aptEnd = apt.end_time;
          
          // Se end_time não existir, calcular baseado na duração do serviço
          if (!aptEnd && apt.services?.duration_minutes) {
            const [startHour, startMinute] = aptStart.split(":").map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = startMinutes + apt.services.duration_minutes;
            const endHour = Math.floor(endMinutes / 60);
            const endMinute = endMinutes % 60;
            aptEnd = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;
          }
          
          return aptEnd && timeString >= aptStart && timeString < aptEnd;
        });

        if (!isOccupied) {
          slots.push({
            date: format(currentDate, "yyyy-MM-dd"),
            time: timeString,
            displayDate: format(currentDate, "dd/MM", { locale: ptBR }),
            displayTime: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          });
          slotsForDay++;
        }

        currentTime += 30; // Próximo slot (30 minutos)
      }

      console.log(`Found ${slotsForDay} available slots for ${dayOfWeek}`);
    }

    console.log(`Total available slots: ${slots.length}`);
    return slots.slice(0, 20); // Limitar a 20 slots
  } catch (error) {
    console.error("Error getting available slots:", error);
    return [];
  }
}

/**
 * Busca agendamentos futuros do negócio
 */
export async function getUpcomingAppointments(
  businessId: string
): Promise<AppointmentData[]> {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        services!inner(name),
        profiles!inner(full_name)
      `)
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", today)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true })
      .limit(10);

    if (!appointments) return [];

    return appointments.map((apt: any) => ({
      id: apt.id,
      date: apt.appointment_date,
      time: apt.appointment_time,
      service_name: apt.services.name,
      client_name: apt.profiles.full_name,
    }));
  } catch (error) {
    console.error("Error getting upcoming appointments:", error);
    return [];
  }
}

/**
 * Busca serviços ativos do negócio
 */
export async function getActiveServices(businessId: string): Promise<ServiceData[]> {
  try {
    const { data: services } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");

    return services || [];
  } catch (error) {
    console.error("Error getting active services:", error);
    return [];
  }
}

/**
 * Preenche o template com os dados fornecidos
 */
export function fillTemplate(template: string, data: Record<string, string>): string {
  let filledTemplate = template;
  
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = key.startsWith("[") ? key : `[${key}]`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    filledTemplate = filledTemplate.replace(regex, value);
  });
  
  return filledTemplate;
}

/**
 * Verifica se o template tem campos que precisam ser preenchidos
 */
export function hasRequiredFields(template: string): boolean {
  return /\[.*?\]/.test(template);
}

/**
 * Extrai os campos do template
 */
export function extractFields(template: string): string[] {
  const matches = template.match(/\[.*?\]/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Formata duração em minutos para texto legível
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${remainingMinutes}min`;
}

/**
 * Formata preço
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}
