import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X, Smartphone, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Verificar se o prompt já foi dispensado
    const promptDismissed = localStorage.getItem("pwa-prompt-dismissed");
    const dismissedDate = promptDismissed ? new Date(promptDismissed) : null;
    const daysSinceDismissed = dismissedDate 
      ? Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Mostrar novamente após 7 dias
    if (daysSinceDismissed && daysSinceDismissed < 7) {
      return;
    }

    // Para dispositivos Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Mostrar o prompt após 3 segundos
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Para iOS, mostrar o prompt após 5 segundos
    if (iOS && !isInstalled) {
      setTimeout(() => {
        setShowPrompt(true);
        setIsInstallable(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        toast({
          title: "App instalado!",
          description: "O ATLAS foi instalado com sucesso no seu dispositivo.",
        });
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error("Erro ao instalar o app:", error);
      toast({
        title: "Erro na instalação",
        description: "Não foi possível instalar o app. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", new Date().toISOString());
  };

  const handleNeverShow = () => {
    setShowPrompt(false);
    // Definir data no futuro distante
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 10);
    localStorage.setItem("pwa-prompt-dismissed", futureDate.toISOString());
    toast({
      title: "Entendido",
      description: "Não mostraremos mais este aviso.",
    });
  };

  if (isInstalled || !isInstallable || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:max-w-md">
      <Card className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {isIOS ? (
                <Share className="h-5 w-5 text-primary" />
              ) : (
                <Download className="h-5 w-5 text-primary" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Instale o ATLAS
            </h3>
            
            {isIOS ? (
              <div className="text-xs text-muted-foreground space-y-2 mb-3">
                <p>Para instalar o app no iOS:</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Toque no ícone <Share className="inline h-3 w-3" /> (Compartilhar)</li>
                  <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                  <li>Confirme tocando em "Adicionar"</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                Instale o ATLAS no seu dispositivo para acesso rápido e experiência completa.
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              {!isIOS && deferredPrompt && (
                <Button 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="text-xs"
                >
                  <Smartphone className="h-3 w-3 mr-1" />
                  Instalar Agora
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-xs"
              >
                Agora não
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleNeverShow}
                className="text-xs text-muted-foreground"
              >
                Não mostrar mais
              </Button>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
