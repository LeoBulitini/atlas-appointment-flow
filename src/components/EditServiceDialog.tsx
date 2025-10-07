import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  setServiceName: (name: string) => void;
  serviceDescription: string;
  setServiceDescription: (description: string) => void;
  serviceDuration: string;
  setServiceDuration: (duration: string) => void;
  servicePrice: string;
  setServicePrice: (price: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditServiceDialog({
  open,
  onOpenChange,
  serviceName,
  setServiceName,
  serviceDescription,
  setServiceDescription,
  serviceDuration,
  setServiceDuration,
  servicePrice,
  setServicePrice,
  onSubmit,
}: EditServiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Serviço</DialogTitle>
          <DialogDescription>Atualize as informações do serviço</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-service-name">Nome do Serviço *</Label>
            <Input
              id="edit-service-name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-service-description">Descrição</Label>
            <Textarea
              id="edit-service-description"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-service-duration">Duração (min) *</Label>
              <Input
                id="edit-service-duration"
                type="number"
                value={serviceDuration}
                onChange={(e) => setServiceDuration(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-service-price">Preço (R$) *</Label>
              <Input
                id="edit-service-price"
                type="number"
                step="0.01"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">Salvar Alterações</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
