import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface FloatingActionButtonProps {
  onQuickBooking?: () => void;
}

export default function FloatingActionButton({ onQuickBooking }: FloatingActionButtonProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showMenu, setShowMenu] = useState(false);

  if (!isMobile) return null;

  const handleScheduleClick = () => {
    setShowMenu(false);
    if (onQuickBooking) {
      onQuickBooking();
    }
  };

  const handleSettingsClick = () => {
    setShowMenu(false);
    navigate("/business/settings?tab=hours");
  };

  return (
    <>
      {/* Botão principal flutuante */}
      <button
        onClick={() => setShowMenu(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Menu de ações"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Dialog com opções */}
      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ações Rápidas</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleScheduleClick}
              className="w-full justify-start text-left h-auto py-4"
              variant="outline"
            >
              <Calendar className="mr-3 h-5 w-5" />
              <div>
                <div className="font-semibold">Agendar S/ Cliente</div>
                <div className="text-sm text-muted-foreground">
                  Criar agendamento rápido
                </div>
              </div>
            </Button>
            <Button
              onClick={handleSettingsClick}
              className="w-full justify-start text-left h-auto py-4"
              variant="outline"
            >
              <Clock className="mr-3 h-5 w-5" />
              <div>
                <div className="font-semibold">Ajustar Horários</div>
                <div className="text-sm text-muted-foreground">
                  Configurar horários de funcionamento
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
