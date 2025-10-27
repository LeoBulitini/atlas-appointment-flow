import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";

const GoogleAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    handleGoogleCallback();
  }, []);

  const handleGoogleCallback = async () => {
    try {
      // 1. Pegar usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Erro ao obter usuário:", userError);
        toast({
          variant: "destructive",
          title: "Erro na autenticação",
          description: "Não foi possível completar o login. Tente novamente.",
        });
        navigate("/auth");
        return;
      }

      // 2. Verificar se perfil existe
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Erro ao buscar perfil:", profileError);
        toast({
          variant: "destructive",
          title: "Erro ao verificar perfil",
          description: "Ocorreu um erro. Tente novamente.",
        });
        navigate("/auth");
        return;
      }

      // 3. Analisar situação e decidir fluxo
      if (profile) {
        // Perfil existe - verificar se está completo
        const isComplete = profile.full_name && 
                          profile.phone && 
                          profile.birth_date && 
                          profile.user_type;
        
        if (isComplete) {
          // ✅ Perfil completo - fazer login
          toast({ 
            title: "Login realizado!", 
            description: "Bem-vindo de volta!" 
          });
          navigate("/");
        } else {
          // ⚠️ Perfil incompleto - completar dados
          toast({ 
            title: "Complete seu perfil", 
            description: "Faltam algumas informações" 
          });
          navigate("/complete-profile");
        }
      } else {
        // 🆕 Perfil não existe - novo usuário
        
        // Verificar se veio do signup com userType na URL
        const params = new URLSearchParams(window.location.search);
        const mode = params.get("mode");
        const userType = params.get("userType");
        
        if (mode === "signup" && userType) {
          // Já sabemos o tipo - redirecionar para completar
          toast({ 
            title: "Bem-vindo!", 
            description: "Complete seu cadastro para continuar" 
          });
          navigate(`/complete-profile?userType=${userType}`);
        } else {
          // Não sabemos o tipo - perguntar
          toast({ 
            title: "Escolha o tipo de conta", 
            description: "Você é cliente ou empresa?" 
          });
          navigate("/select-account-type");
        }
      }
    } catch (error: any) {
      console.error("Erro no callback do Google:", error);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: error.message || "Ocorreu um erro. Tente novamente.",
      });
      navigate("/auth");
    }
  };

  return <LoadingScreen showCards={false} showTable={false} />;
};

export default GoogleAuthCallback;
