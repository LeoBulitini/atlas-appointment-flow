import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    console.log("Starting birthday email check...");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get today's date (month and day only)
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const todayDay = today.getDate();
    
    console.log(`Checking birthdays for: ${todayMonth}/${todayDay}`);
    
    // Find all users with birthday today
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, birth_date")
      .not("birth_date", "is", null);
    
    if (error) {
      console.error("Error fetching profiles:", error);
      throw error;
    }
    
    console.log(`Found ${profiles?.length || 0} profiles with birth dates`);
    
    const birthdayUsers = profiles?.filter((profile) => {
      if (!profile.birth_date) return false;
      
      const birthDate = new Date(profile.birth_date);
      const birthMonth = birthDate.getMonth() + 1;
      const birthDay = birthDate.getDate();
      
      return birthMonth === todayMonth && birthDay === todayDay;
    }) || [];
    
    console.log(`Found ${birthdayUsers.length} users with birthdays today`);
    
    // Get user emails from auth.users
    for (const user of birthdayUsers) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authError || !authUser?.user?.email) {
          console.error(`Error getting email for user ${user.id}:`, authError);
          continue;
        }
        
        const email = authUser.user.email;
        
        // Call send-appointment-email function to send birthday email
        const { error: emailError } = await supabase.functions.invoke(
          "send-appointment-email",
          {
            body: {
              to: email,
              subject: "🎉 Feliz Aniversário! - ATLAS",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #4F46E5;">🎂 Feliz Aniversário, ${user.full_name}!</h1>
                  <p>Toda a equipe ATLAS deseja um dia muito especial para você!</p>
                  <p>Que este novo ano de vida seja repleto de alegrias, saúde e realizações.</p>
                  <p style="margin-top: 30px;">Com carinho,<br><strong>Equipe ATLAS</strong></p>
                </div>
              `,
            },
          }
        );
        
        if (emailError) {
          console.error(`Error sending birthday email to ${email}:`, emailError);
        } else {
          console.log(`Birthday email sent successfully to ${email}`);
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${birthdayUsers.length} birthday emails`,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-birthday-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});