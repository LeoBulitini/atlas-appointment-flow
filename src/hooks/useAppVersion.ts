import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_VERSION_KEY = "atlas_app_version";

export const useAppVersion = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      // Busca versão do servidor
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();

      if (error) throw error;

      const remoteVersion = data?.value;
      const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

      setServerVersion(remoteVersion);

      // Se não tem versão local, é primeira vez - salva e não mostra modal
      if (!localVersion) {
        if (remoteVersion) {
          localStorage.setItem(LOCAL_VERSION_KEY, remoteVersion);
        }
        setShowUpdate(false);
      } 
      // Se versões são diferentes, mostra modal
      else if (localVersion !== remoteVersion && remoteVersion) {
        setShowUpdate(true);
      }
    } catch (error) {
      console.error("Erro ao verificar versão:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = () => {
    if (serverVersion) {
      // Atualiza versão local
      localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
      
      // Limpa caches e recarrega
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Força reload completo (ignora cache)
      window.location.reload();
    }
  };

  return {
    showUpdate,
    isLoading,
    serverVersion,
    handleUpdate,
  };
};
