import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

const SearchBar = () => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-card rounded-xl shadow-elegant">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar serviços (cabelo, massagem, manicure...)"
            className="pl-10 h-12 border-0 bg-secondary focus-visible:ring-primary"
          />
        </div>
        
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Localização"
            className="pl-10 h-12 border-0 bg-secondary focus-visible:ring-primary"
          />
        </div>
        
        <Button size="lg" variant="hero" className="h-12 px-8">
          Buscar
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
