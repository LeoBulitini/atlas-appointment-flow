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
import { useAppVersion } from "@/hooks/useAppVersion";

export const UpdatePWA = () => {
  const { showUpdate, serverVersion, handleUpdate } = useAppVersion();

  return (
    <AlertDialog open={showUpdate}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <AlertDialogTitle className="text-xl">
            Nova Atualização Disponível! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Uma nova versão do ATLAS ({serverVersion}) está disponível com melhorias e novos recursos. 
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
