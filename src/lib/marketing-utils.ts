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
  days: number = 7
): Promise<AvailableSlot[]> {
  try {
    // Buscar horário de funcionamento do negócio
    const { data: business } = await supabase
      .from("businesses")
      .select("opening_hours")
      .eq("id", businessId)
      .single();

    if (!business?.opening_hours) return [];

    const openingHours = business.opening_hours as any;
    const today = new Date();
    const slots: AvailableSlot[] = [];

    // Buscar todos os agendamentos confirmados/pendentes no período
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time, end_time")
      .eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", format(today, "yyyy-MM-dd"))
      .lte("appointment_date", format(addDays(today, days), "yyyy-MM-dd"));

    // Mapear dias da semana
    const weekDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Para cada dia
    for (let i = 0; i < days; i++) {
      const currentDate = addDays(today, i);
      const dayOfWeek = weekDays[currentDate.getDay()];
      const dayHours = openingHours[dayOfWeek];

      if (!dayHours || dayHours.closed) continue;

      // Gerar slots de 30 em 30 minutos
      const [openHour, openMinute] = dayHours.open.split(":").map(Number);
      const [closeHour, closeMinute] = dayHours.close.split(":").map(Number);

      let currentTime = openHour * 60 + openMinute; // em minutos
      const closeTime = closeHour * 60 + closeMinute;

      while (currentTime < closeTime) {
        const hour = Math.floor(currentTime / 60);
        const minute = currentTime % 60;
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;

        // Verificar se este horário está ocupado
        const isOccupied = appointments?.some((apt) => {
          if (apt.appointment_date !== format(currentDate, "yyyy-MM-dd")) return false;
          
          const aptStart = apt.appointment_time;
          const aptEnd = apt.end_time;
          
          return timeString >= aptStart && timeString < aptEnd;
        });

        if (!isOccupied) {
          slots.push({
            date: format(currentDate, "yyyy-MM-dd"),
            time: timeString,
            displayDate: format(currentDate, "dd/MM", { locale: ptBR }),
            displayTime: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          });
        }

        currentTime += 30; // Próximo slot (30 minutos)
      }
    }

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
