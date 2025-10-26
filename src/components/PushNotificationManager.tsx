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
  const [hasAttemptedInit, setHasAttemptedInit] = useState(false);

  useEffect(() => {
    const initPushNotifications = async () => {
      // Apenas executar uma vez
      if (hasAttemptedInit) return;
      
      try {
        // Verificar se o usuário está autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Marcar que já tentamos inicializar
        setHasAttemptedInit(true);
        console.log('[PushManager] Initializing for user:', user.id);

        // Verificar se já solicitou permissão antes
        const hasAskedPermission = localStorage.getItem('push_permission_asked');
        
        // Aguardar um pouco para garantir que o hook checkSubscription já rodou
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Se já está subscrito após o check, não fazer nada
        if (pushNotifications.isSubscribed) {
          console.log('[PushManager] Already subscribed, skipping');
          return;
        }

        // Se ainda não solicitou permissão, solicitar agora
        if (!hasAskedPermission && pushNotifications.isSupported) {
          console.log('[PushManager] First time, requesting permission');
          // Aguardar mais um pouco para não ser muito invasivo
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
                toast.info('Você pode ativar notificações nas configurações.');
              }
            } catch (error) {
              console.error('[PushManager] Error subscribing:', error);
              localStorage.setItem('push_permission_asked', 'true');
            }
          }, 1000);
        } else {
          console.log('[PushManager] Permission already asked or not supported');
        }
      } catch (error) {
        console.error('[PushManager] Error initializing:', error);
      }
    };

    // Verificar suporte antes de tentar inicializar
    if (pushNotifications.isSupported && !hasAttemptedInit) {
      initPushNotifications();
    }
  }, [pushNotifications.isSupported, hasAttemptedInit]);

  // Componente não renderiza nada
  return null;
};
