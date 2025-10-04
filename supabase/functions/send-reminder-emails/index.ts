import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_id: string;
  business_id: string;
  service_id: string;
  notes: string | null;
}

interface Profile {
  full_name: string;
  phone: string | null;
}

interface Business {
  name: string;
  address: string;
  phone: string;
}

interface Service {
  name: string;
  duration_minutes: number;
}

const handler = async (_req: Request): Promise<Response> => {
  try {
    console.log("🔔 Iniciando verificação de lembretes de agendamento...");

    // Buscar agendamentos confirmados que precisam de lembrete
    // (agendamentos entre 15-20 minutos no futuro)
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        notes,
        client_id,
        business_id,
        service_id
      `)
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("appointment_date", now.toISOString().split("T")[0])
      .returns<Appointment[]>();

    if (appointmentsError) {
      console.error("Erro ao buscar agendamentos:", appointmentsError);
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      console.log("Nenhum agendamento pendente de lembrete");
      return new Response(
        JSON.stringify({ message: "Nenhum lembrete para enviar" }),
        { status: 200 }
      );
    }

    console.log(`📋 ${appointments.length} agendamentos encontrados`);

    let sentCount = 0;

    for (const appointment of appointments) {
      try {
        // Calcular timestamp do agendamento
        const appointmentDateTime = new Date(
          `${appointment.appointment_date}T${appointment.appointment_time}`
        );

        // Verificar se está no intervalo de 15-20 minutos
        if (
          appointmentDateTime < fifteenMinutesFromNow ||
          appointmentDateTime > twentyMinutesFromNow
        ) {
          continue;
        }

        // Buscar dados do cliente
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", appointment.client_id)
          .single<Profile>();

        if (!clientProfile) continue;

        // Buscar email do cliente
        const { data: userData } = await supabase.auth.admin.getUserById(
          appointment.client_id
        );
        const clientEmail = userData?.user?.email;

        if (!clientEmail) continue;

        // Buscar dados do negócio
        const { data: business } = await supabase
          .from("businesses")
          .select("name, address, phone")
          .eq("id", appointment.business_id)
          .single<Business>();

        if (!business) continue;

        // Buscar dados do serviço
        const { data: service } = await supabase
          .from("services")
          .select("name, duration_minutes")
          .eq("id", appointment.service_id)
          .single<Service>();

        if (!service) continue;

        // Formatar horário
        const timeFormatted = appointment.appointment_time.substring(0, 5);

        // Enviar email de lembrete
        const emailResponse = await resend.emails.send({
          from: `${business.name} <onboarding@resend.dev>`,
          to: [clientEmail],
          subject: `🔔 Lembrete: Seu agendamento é em 15 minutos!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">🔔 Lembrete de Agendamento</h2>
              <p>Olá <strong>${clientProfile.full_name}</strong>,</p>
              <p>Este é um lembrete de que você tem um agendamento <strong>em 15 minutos</strong>!</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">📋 Detalhes do Agendamento</h3>
                <p><strong>Estabelecimento:</strong> ${business.name}</p>
                <p><strong>Serviço:</strong> ${service.name}</p>
                <p><strong>Data:</strong> ${new Date(appointment.appointment_date).toLocaleDateString("pt-BR")}</p>
                <p><strong>Horário:</strong> ${timeFormatted}</p>
                <p><strong>Duração:</strong> ${service.duration_minutes} minutos</p>
                ${appointment.notes ? `<p><strong>Observações:</strong> ${appointment.notes}</p>` : ""}
              </div>

              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Endereço:</strong></p>
                <p style="margin: 5px 0 0 0;">${business.address}</p>
              </div>

              <p>Nos vemos em breve!</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Em caso de dúvidas, entre em contato: ${business.phone}
              </p>
            </div>
          `,
        });

        if (emailResponse.error) {
          console.error(
            `Erro ao enviar email para ${clientEmail}:`,
            emailResponse.error
          );
          continue;
        }

        // Marcar como enviado
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appointment.id);

        console.log(`✅ Lembrete enviado para ${clientEmail}`);
        sentCount++;
      } catch (error) {
        console.error(
          `Erro ao processar agendamento ${appointment.id}:`,
          error
        );
      }
    }

    console.log(`🎉 ${sentCount} lembretes enviados com sucesso`);

    return new Response(
      JSON.stringify({
        message: `${sentCount} lembretes enviados`,
        processed: appointments.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro geral:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

serve(handler);
