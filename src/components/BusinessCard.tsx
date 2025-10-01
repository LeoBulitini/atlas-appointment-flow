import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BusinessCardProps {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  address: string;
  image: string;
  priceRange: string;
  openNow: boolean;
}

const BusinessCard = ({
  name,
  category,
  rating,
  reviewCount,
  address,
  image,
  priceRange,
  openNow,
}: BusinessCardProps) => {
  return (
    <Card className="group overflow-hidden transition-smooth hover:shadow-elegant cursor-pointer">
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-smooth group-hover:scale-110"
        />
        <div className="absolute top-3 right-3">
          {openNow && (
            <Badge className="bg-green-500 text-white shadow-md">
              <Clock className="mr-1 h-3 w-3" />
              Aberto
            </Badge>
          )}
        </div>
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

        <div className="flex items-center gap-1 mb-3">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{rating}</span>
          <span className="text-sm text-muted-foreground">
            ({reviewCount} avaliações)
          </span>
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
