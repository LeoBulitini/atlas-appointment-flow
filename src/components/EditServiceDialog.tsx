import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useState } from "react";

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
  serviceImageUrl: string | null;
  setServiceImageUrl: (url: string | null) => void;
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
  serviceImageUrl,
  setServiceImageUrl,
  onSubmit,
}: EditServiceDialogProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(serviceImageUrl);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setServiceImageUrl(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setServiceImageUrl(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Serviço</DialogTitle>
          <DialogDescription>Atualize as informações do serviço</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-service-image">Foto do Serviço</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para adicionar foto</span>
                  <input
                    id="edit-service-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>
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