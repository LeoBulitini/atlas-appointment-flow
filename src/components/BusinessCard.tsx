import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistance } from "@/lib/distance-utils";

interface BusinessCardProps {
  id: string;
  name: string;
  category: string;
  address: string;
  image: string;
  priceRange: string;
  distance?: number;
}

const BusinessCard = ({
  id,
  name,
  category,
  address,
  image,
  priceRange,
  distance,
}: BusinessCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = async () => {
    // Track view
    try {
      await supabase.rpc("increment_business_views", { business_uuid: id });
    } catch (error) {
      console.error("Error tracking view:", error);
    }

    // Navigate to booking page
    navigate(`/booking/${id}`, { state: { from: "explore" } });
  };

  return (
    <Card 
      className="group overflow-hidden transition-smooth hover:shadow-elegant cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-smooth group-hover:scale-110"
        />
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2">
          <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-smooth">
            {name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Badge variant="secondary">{category}</Badge>
            <span>{priceRange}</span>
            {distance !== undefined && (
              <div className="flex items-center gap-1 text-primary">
                <Navigation className="h-3 w-3" />
                <span className="font-medium">{formatDistance(distance)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        </div>

        <Button className="w-full" variant="default">
          Ver Disponibilidade
        </Button>
      </CardContent>
    </Card>
  );
};

export default BusinessCard;
