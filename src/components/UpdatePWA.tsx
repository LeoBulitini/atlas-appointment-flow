import { useState, useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const UpdatePWA = () => {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Detecta quando há uma nova versão esperando
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Nova versão disponível
                setWaitingWorker(newWorker);
                setShowUpdateDialog(true);
              }
            });
          }
        });

        // Verifica se já existe um SW esperando
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdateDialog(true);
        }
      });

      // Detecta quando o novo SW assume o controle
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Envia mensagem para o SW pular a espera
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <AlertDialog open={showUpdateDialog}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <AlertDialogTitle className="text-xl">
            Nova Atualização Disponível! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Uma nova versão do ATLAS está disponível com melhorias e novos recursos. 
            Atualize agora para ter a melhor experiência.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction 
            onClick={handleUpdate}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Agora
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
