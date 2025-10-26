import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

/**
 * Componente que gerencia automaticamente a ativação de notificações push
 * na primeira vez que o usuário entra no app
 */
export const PushNotificationManager = () => {
  const pushNotifications = usePushNotifications();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        // Verificar se o usuário está autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || hasChecked) return;

        setHasChecked(true);

        // Verificar se já solicitou permissão antes
        const hasAskedPermission = localStorage.getItem('push_permission_asked');
        
        // Se já está subscrito, não fazer nada
        if (pushNotifications.isSubscribed) {
          return;
        }

        // Se ainda não solicitou permissão, solicitar agora
        if (!hasAskedPermission && pushNotifications.isSupported) {
          // Aguardar um pouco para não ser muito invasivo (esperar a página carregar)
          setTimeout(async () => {
            try {
              // Tentar ativar automaticamente
              const success = await pushNotifications.subscribe();
              
              // Marcar que já solicitamos
              localStorage.setItem('push_permission_asked', 'true');
              
              if (success) {
                toast.success('Notificações ativadas! Você receberá atualizações importantes.');
              } else {
                // Se falhou, mostrar mensagem amigável
                toast.info('Você pode ativar notificações nas configurações para receber atualizações.');
              }
            } catch (error) {
              console.error('[PushManager] Error subscribing:', error);
              localStorage.setItem('push_permission_asked', 'true');
            }
          }, 2000); // Espera 2 segundos após o login
        }
      } catch (error) {
        console.error('[PushManager] Error initializing:', error);
      }
    };

    // Verificar suporte antes de tentar inicializar
    if (pushNotifications.isSupported) {
      initPushNotifications();
    }
  }, [pushNotifications.isSubscribed, pushNotifications.isSupported, hasChecked]);

  // Componente não renderiza nada
  return null;
};
