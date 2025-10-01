import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusinessCardProps {
  id: string;
  name: string;
  category: string;
  address: string;
  image: string;
  priceRange: string;
}

const BusinessCard = ({
  id,
  name,
  category,
  address,
  image,
  priceRange,
}: BusinessCardProps) => {
  const navigate = useNavigate();
  return (
    <Card 
      className="group overflow-hidden transition-smooth hover:shadow-elegant cursor-pointer"
      onClick={() => navigate(`/booking/${id}`)}
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{category}</Badge>
            <span>{priceRange}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-4 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{address}</span>
        </div>

        <Button className="w-full" variant="default">
          Ver Disponibilidade
        </Button>
      </CardContent>
    </Card>
  );
};

export default BusinessCard;
