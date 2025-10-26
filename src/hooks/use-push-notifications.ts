import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkSupport();
    checkPermission();
    
    // Verificar subscription apenas uma vez após suporte ser confirmado
    if (isSupported && !isChecking) {
      checkSubscription();
    }
  }, [isSupported]);

  const checkSupport = () => {
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscription = async () => {
    if (!isSupported || isChecking) return;

    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Verificar subscription no navegador
      const registration = await navigator.serviceWorker.ready;
      const browserSubscription = await registration.pushManager.getSubscription();

      // Verificar subscriptions no banco
      const { data: dbSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const hasDbSubscription = dbSubscriptions && dbSubscriptions.length > 0;

      // CASO 1: Tem no navegador E no banco = TUDO OK ✅
      if (browserSubscription && hasDbSubscription) {
        console.log('[Push] Subscription active (browser + DB)');
        setIsSubscribed(true);
        setIsChecking(false);
        return;
      }

      // CASO 2: Tem APENAS no navegador = Tentar salvar no banco
      if (browserSubscription && !hasDbSubscription) {
        console.log('[Push] Browser subscription found, saving to DB');
        try {
          const deviceType = detectDeviceType();
          const { error } = await supabase
            .from('push_subscriptions')
            .insert({
              user_id: user.id,
              subscription: browserSubscription.toJSON() as any,
              device_type: deviceType,
              user_agent: navigator.userAgent
            });

          if (!error) {
            console.log('[Push] Subscription saved to DB');
            setIsSubscribed(true);
          } else {
            console.error('[Push] Failed to save to DB:', error);
            // Manter como subscrito porque o navegador tem
            setIsSubscribed(true);
          }
        } catch (err) {
          console.error('[Push] Error saving to DB:', err);
          // Manter como subscrito porque o navegador tem
          setIsSubscribed(true);
        }
        setIsChecking(false);
        return;
      }

      // CASO 3: Tem APENAS no banco = Fazer cleanup
      if (!browserSubscription && hasDbSubscription) {
        console.log('[Push] Orphaned DB subscription, cleaning up');
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
        setIsSubscribed(false);
        setIsChecking(false);
        return;
      }

      // CASO 4: Não tem em nenhum lugar
      console.log('[Push] No subscription found');
      setIsSubscribed(false);
      setIsChecking(false);
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
      setIsSubscribed(false);
      setIsChecking(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications não são suportados neste navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    console.log('[Push] Subscribe called, current state:', { isSubscribed, permission, loading });
    setLoading(true);

    try {
      // Solicitar permissão se necessário
      if (permission !== 'granted') {
        console.log('[Push] Requesting permission');
        const granted = await requestPermission();
        if (!granted) {
          console.log('[Push] Permission denied');
          setLoading(false);
          return false;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Push] No user authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[Push] User authenticated:', user.id);

      // Verificar se já existe subscription no banco ANTES de limpar
      const { data: existingDbSubs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Se já existe subscription ativa no banco E no navegador, retornar sucesso
      const registration = await navigator.serviceWorker.ready;
      const existingBrowserSub = await registration.pushManager.getSubscription();
      
      console.log('[Push] Existing state:', { 
        browserSub: !!existingBrowserSub, 
        dbSubs: existingDbSubs?.length || 0 
      });
      
      if (existingDbSubs && existingDbSubs.length > 0 && existingBrowserSub) {
        console.log('[Push] Already subscribed, returning true');
        setIsSubscribed(true);
        setLoading(false);
        return true;
      }

      // Limpar subscription do navegador se existir
      if (existingBrowserSub) {
        console.log('[Push] Cleaning up old browser subscription');
        await existingBrowserSub.unsubscribe();
      }

      // Limpar subscriptions antigas do banco
      if (existingDbSubs && existingDbSubs.length > 0) {
        console.log('[Push] Cleaning up old DB subscriptions');
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);
      }

      console.log('[Push] Creating new subscription');
      // Criar nova subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        )
      });

      // Detectar tipo de dispositivo
      const deviceType = detectDeviceType();

      console.log('[Push] Saving subscription to DB');
      // Salvar no banco
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          subscription: subscription.toJSON() as any,
          device_type: deviceType,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('[Push] Error saving to DB:', error);
        // Se der erro, tentar desinscrever do navegador também
        await subscription.unsubscribe();
        throw error;
      }

      console.log('[Push] Subscription saved successfully');
      setIsSubscribed(true);
      toast.success('Notificações ativadas com sucesso!');
      return true;

    } catch (error: any) {
      console.error('[Push] Error subscribing:', error);
      
      // Mensagem de erro mais específica
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe uma inscrição ativa. Tente desativar e ativar novamente.');
      } else if (error.code === 'PGRST301') {
        // Erro de unique constraint
        console.log('[Push] Duplicate constraint, already subscribed');
        toast.info('Notificações já estão ativas.');
        setIsSubscribed(true);
        return true;
      } else {
        toast.error('Erro ao ativar notificações. Tente novamente.');
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remover do banco - simplificado para evitar erro de tipo
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Deletar todas as subscriptions do usuário (simplificado)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas');
      return true;

    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
    checkSubscription // Expor para debug
  };
};

// Helpers
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectDeviceType(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}
