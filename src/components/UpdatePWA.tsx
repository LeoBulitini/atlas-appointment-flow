import { useState, useEffect } from "react";
import { Workbox } from "workbox-window";
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
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.hostname !== "localhost") {
      const workbox = new Workbox("/sw.js");

      // Detecta quando há uma nova versão esperando
      workbox.addEventListener("waiting", () => {
        setShowUpdateDialog(true);
      });

      // Detecta quando o SW foi instalado pela primeira vez
      workbox.addEventListener("installed", (event) => {
        if (!event.isUpdate) {
          console.log("Service Worker instalado pela primeira vez");
        }
      });

      workbox.register();
      setWb(workbox);
    }
  }, []);

  const handleUpdate = () => {
    if (wb) {
      // Envia mensagem para o SW pular a espera
      wb.messageSkipWaiting();
      
      // Recarrega a página quando o novo SW assumir
      wb.addEventListener("controlling", () => {
        window.location.reload();
      });
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
