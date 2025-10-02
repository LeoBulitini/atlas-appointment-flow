import { useState } from "react";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  businessId: string;
  onReviewSubmitted: () => void;
}

export function ReviewDialog({ open, onOpenChange, appointmentId, businessId, onReviewSubmitted }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma avaliação",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para avaliar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("reviews").insert({
      business_id: businessId,
      client_id: user.id,
      appointment_id: appointmentId,
      rating,
      comment: comment.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua avaliação",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Avaliação enviada com sucesso!",
    });
    
    onReviewSubmitted();
    onOpenChange(false);
    setRating(0);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar Atendimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Comentário (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
