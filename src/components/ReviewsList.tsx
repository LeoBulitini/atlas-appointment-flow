import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface ReviewsListProps {
  businessId: string;
  limit?: number;
}

export function ReviewsList({ businessId, limit }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [businessId, limit]);

  const fetchReviews = async () => {
    let query = supabase
      .from("reviews")
      .select("id, rating, comment, created_at, profiles!client_id(full_name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reviews:", error);
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando avaliações...</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">Nenhuma avaliação ainda</div>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold">{review.profiles.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(review.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            {review.comment && <p className="text-sm mt-2">{review.comment}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
