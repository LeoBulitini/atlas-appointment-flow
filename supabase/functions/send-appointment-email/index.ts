import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  appointmentId: string;
  type: 'new_appointment' | 'appointment_confirmed' | 'appointment_rescheduled' | 'appointment_cancelled' | 'appointment_completed';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, type }: EmailRequest = await req.json();
    
    console.log(`[Email] Processing ${type} for appointment ${appointmentId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch appointment details with all related data
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        businesses (name, address, city, state, phone, email),
        profiles!appointments_client_id_fkey (full_name),
        appointment_services (
          services (name, price, duration_minutes)
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("[Email] Error fetching appointment:", appointmentError);
      throw new Error("Appointment not found");
    }

    // Fetch client email from auth.users
    const { data: { user: clientUser }, error: userError } = await supabase.auth.admin.getUserById(
      appointment.client_id
    );

    if (userError || !clientUser) {
      console.error("[Email] Error fetching client user:", userError);
      throw new Error("Client user not found");
    }

    const business = appointment.businesses;
    const client = {
      full_name: appointment.profiles.full_name,
      email: clientUser.email
    };
    const services = appointment.appointment_services.map((as: any) => as.services);
    
    const totalPrice = services.reduce((sum: number, s: any) => sum + Number(s.price), 0);
    const totalDuration = services.reduce((sum: number, s: any) => sum + Number(s.duration_minutes), 0);
    
    console.log(`[Email] Sending to client: ${client.email}, business: ${business.email}`);

    // Check if emails exist
    if (!client.email) {
      console.warn("[Email] Client email not found");
      return new Response(
        JSON.stringify({ success: false, error: "Client email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!business.email) {
      console.warn("[Email] Business email not found");
    }

    // Generate email templates based on type
    const { clientSubject, clientHtml, businessSubject, businessHtml } = generateEmailContent(
      type,
      appointment,
      business,
      client,
      services,
      totalPrice,
      totalDuration
    );

    // Send email to client
    const clientEmailResponse = await resend.emails.send({
      from: "AgendaFácil <contato@atlasbook.com.br>",
      to: [client.email],
      subject: clientSubject,
      html: clientHtml,
    });

    console.log("[Email] Client email sent:", clientEmailResponse);

    // Send email to business if email exists
    let businessEmailResponse = null;
    if (business.email) {
      businessEmailResponse = await resend.emails.send({
        from: "AgendaFácil <contato@atlasbook.com.br>",
        to: [business.email],
        subject: businessSubject,
        html: businessHtml,
      });
      console.log("[Email] Business email sent:", businessEmailResponse);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientEmailId: clientEmailResponse.data?.id,
        businessEmailId: businessEmailResponse?.data?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

function generateEmailContent(
  type: string,
  appointment: any,
  business: any,
  client: any,
  services: any[],
  totalPrice: number,
  totalDuration: number
) {
  const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('pt-BR');
  const appointmentTime = appointment.appointment_time;
  const servicesHtml = services.map(s => 
    `<li><strong>${s.name}</strong> - R$ ${Number(s.price).toFixed(2)} (${s.duration_minutes} min)</li>`
  ).join('');

  const baseStyle = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
      .info-row { margin: 10px 0; }
      .label { font-weight: bold; color: #667eea; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: #666; }
      ul { list-style: none; padding: 0; }
      li { padding: 8px 0; border-bottom: 1px solid #eee; }
    </style>
  `;

  let clientSubject = "";
  let clientHtml = "";
  let businessSubject = "";
  let businessHtml = "";

  switch (type) {
    case 'new_appointment':
      clientSubject = `🎉 Agendamento Realizado - ${business.name}`;
      clientHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Agendamento Realizado!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${client.full_name}</strong>,</p>
            <p>Seu agendamento foi realizado com sucesso!</p>
            
            <div class="info-box">
              <h3>📋 Detalhes do Agendamento</h3>
              <div class="info-row"><span class="label">Estabelecimento:</span> ${business.name}</div>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              <div class="info-row"><span class="label">Duração Total:</span> ${totalDuration} minutos</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
              
              <div class="info-row" style="margin-top: 20px; font-size: 18px;">
                <span class="label">Valor Total:</span> R$ ${totalPrice.toFixed(2)}
              </div>
            </div>

            <div class="info-box">
              <h3>📍 Endereço</h3>
              <p>${business.address}, ${business.city} - ${business.state}</p>
              ${business.phone ? `<p><strong>Telefone:</strong> ${business.phone}</p>` : ''}
            </div>

            ${appointment.notes ? `
              <div class="info-box">
                <h3>📝 Observações</h3>
                <p>${appointment.notes}</p>
              </div>
            ` : ''}

            <p style="margin-top: 30px;">Aguarde a confirmação do estabelecimento.</p>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;

      businessSubject = `📅 Novo Agendamento - ${client.full_name}`;
      businessHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Novo Agendamento!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${business.name}</strong>,</p>
            <p>Você recebeu um novo agendamento!</p>
            
            <div class="info-box">
              <h3>👤 Cliente</h3>
              <div class="info-row"><span class="label">Nome:</span> ${client.full_name}</div>
              ${client.email ? `<div class="info-row"><span class="label">E-mail:</span> ${client.email}</div>` : ''}
            </div>

            <div class="info-box">
              <h3>📋 Detalhes do Agendamento</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              <div class="info-row"><span class="label">Duração:</span> ${totalDuration} minutos</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
              
              <div class="info-row" style="margin-top: 20px; font-size: 18px;">
                <span class="label">Valor Total:</span> R$ ${totalPrice.toFixed(2)}
              </div>
            </div>

            ${appointment.notes ? `
              <div class="info-box">
                <h3>📝 Observações do Cliente</h3>
                <p>${appointment.notes}</p>
              </div>
            ` : ''}

            <p style="margin-top: 30px;"><strong>⚠️ Lembre-se de confirmar o agendamento no sistema!</strong></p>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'appointment_confirmed':
      clientSubject = `✅ Agendamento Confirmado - ${business.name}`;
      clientHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>✅ Agendamento Confirmado!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${client.full_name}</strong>,</p>
            <p>Ótimas notícias! Seu agendamento foi confirmado por <strong>${business.name}</strong>!</p>
            
            <div class="info-box">
              <h3>📋 Detalhes do Agendamento</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              <div class="info-row"><span class="label">Duração:</span> ${totalDuration} minutos</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
            </div>

            <div class="info-box">
              <h3>📍 Endereço</h3>
              <p>${business.address}, ${business.city} - ${business.state}</p>
              ${business.phone ? `<p><strong>Telefone:</strong> ${business.phone}</p>` : ''}
            </div>

            <p style="margin-top: 30px;">Aguardamos você no horário marcado!</p>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;

      businessSubject = `✅ Confirmação Registrada - ${client.full_name}`;
      businessHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Confirmação Registrada</h1>
          </div>
          <div class="content">
            <p>O agendamento com <strong>${client.full_name}</strong> foi confirmado com sucesso.</p>
            
            <div class="info-box">
              <h3>📋 Detalhes</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'appointment_rescheduled':
      clientSubject = `🔄 Agendamento Alterado - ${business.name}`;
      clientHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>🔄 Agendamento Alterado</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${client.full_name}</strong>,</p>
            <p>Seu agendamento com <strong>${business.name}</strong> foi alterado.</p>
            
            <div class="info-box">
              <h3>📋 Novos Detalhes</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              <div class="info-row"><span class="label">Duração:</span> ${totalDuration} minutos</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
              
              <div class="info-row" style="margin-top: 20px; font-size: 18px;">
                <span class="label">Valor Total:</span> R$ ${totalPrice.toFixed(2)}
              </div>
            </div>

            <div class="info-box">
              <h3>📍 Endereço</h3>
              <p>${business.address}, ${business.city} - ${business.state}</p>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;

      businessSubject = `🔄 Agendamento Alterado - ${client.full_name}`;
      businessHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>🔄 Agendamento Alterado</h1>
          </div>
          <div class="content">
            <p><strong>${client.full_name}</strong> alterou o agendamento.</p>
            
            <div class="info-box">
              <h3>📋 Novos Detalhes</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'appointment_cancelled':
      clientSubject = `❌ Agendamento Cancelado - ${business.name}`;
      clientHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <h1>❌ Agendamento Cancelado</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${client.full_name}</strong>,</p>
            <p>Seu agendamento com <strong>${business.name}</strong> foi cancelado.</p>
            
            <div class="info-box">
              <h3>📋 Detalhes do Agendamento Cancelado</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
            </div>

            <p style="margin-top: 30px;">Se desejar, você pode fazer um novo agendamento a qualquer momento.</p>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;

      businessSubject = `❌ Agendamento Cancelado - ${client.full_name}`;
      businessHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <h1>❌ Agendamento Cancelado</h1>
          </div>
          <div class="content">
            <p><strong>${client.full_name}</strong> cancelou o agendamento.</p>
            
            <div class="info-box">
              <h3>📋 Detalhes</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              
              <h4 style="margin-top: 20px;">Serviços:</h4>
              <ul>${servicesHtml}</ul>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      break;

    case 'appointment_completed':
      clientSubject = `✅ Serviço Concluído - ${business.name}`;
      clientHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
            <h1>✅ Serviço Concluído</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${client.full_name}</strong>,</p>
            <p>Obrigado por escolher <strong>${business.name}</strong>! Seu atendimento foi concluído com sucesso.</p>
            
            <div class="info-box">
              <h3>📋 Detalhes do Atendimento</h3>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              
              <h4 style="margin-top: 20px;">Serviços Realizados:</h4>
              <ul>${servicesHtml}</ul>
              
              <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div class="info-row"><span class="label">Valor Total:</span> <strong style="color: #11998e; font-size: 18px;">R$ ${totalPrice.toFixed(2)}</strong></div>
              </div>
            </div>
            
            <p style="margin-top: 30px;">Gostou do atendimento? Deixe sua avaliação e ajude outros clientes!</p>
            
            <p style="margin-top: 20px; color: #666;">Esperamos vê-lo novamente em breve! 💚</p>
            
            <div class="footer">
              <p style="margin-bottom: 10px;"><strong>${business.name}</strong></p>
              <p>${business.address}, ${business.city} - ${business.state}</p>
              <p>📞 ${business.phone}</p>
              <p style="margin-top: 15px; color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      
      businessSubject = `✅ Atendimento Concluído - ${client.full_name}`;
      businessHtml = `
        ${baseStyle}
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
            <h1>✅ Atendimento Concluído</h1>
          </div>
          <div class="content">
            <p>O atendimento de <strong>${client.full_name}</strong> foi marcado como concluído.</p>
            
            <div class="info-box">
              <h3>📋 Detalhes</h3>
              <div class="info-row"><span class="label">Cliente:</span> ${client.full_name}</div>
              <div class="info-row"><span class="label">Data:</span> ${appointmentDate}</div>
              <div class="info-row"><span class="label">Horário:</span> ${appointmentTime}</div>
              
              <h4 style="margin-top: 20px;">Serviços Realizados:</h4>
              <ul>${servicesHtml}</ul>
              
              <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div class="info-row"><span class="label">Valor Total:</span> <strong style="color: #11998e; font-size: 18px;">R$ ${totalPrice.toFixed(2)}</strong></div>
              </div>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail automático, por favor não responda.</p>
              <p style="color: #999; font-size: 12px;">AgendaFácil - Sistema de Agendamentos</p>
            </div>
          </div>
        </div>
      `;
      break;
  }

  return { clientSubject, clientHtml, businessSubject, businessHtml };
}

serve(handler);
