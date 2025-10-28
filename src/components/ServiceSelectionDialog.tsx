import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
}

interface ServiceSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  selectedServices: string[];
  onConfirm: (serviceIds: string[]) => void;
}

export const ServiceSelectionDialog = ({
  open,
  onOpenChange,
  services,
  selectedServices: initialSelectedServices,
  onConfirm,
}: ServiceSelectionDialogProps) => {
  const [selectedServices, setSelectedServices] = useState<string[]>(initialSelectedServices);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedServices);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedServices(initialSelectedServices);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Serviços</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredServices.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <Card
                key={service.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  isSelected
                    ? "border-primary border-2 bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => toggleService(service.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base md:text-lg truncate">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">
                        {service.duration_minutes} min
                      </span>
                      <span className="text-primary font-semibold">
                        R$ {service.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                    ) : (
                      <Circle className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground/30" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredServices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum serviço encontrado
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedServices.length === 0}
            className="w-full sm:w-auto"
          >
            Confirmar ({selectedServices.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
