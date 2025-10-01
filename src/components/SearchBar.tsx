import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SearchBar = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Busca em desenvolvimento",
      description: "A funcionalidade de busca será implementada em breve!",
    });
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-card rounded-xl shadow-elegant">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar serviços (cabelo, massagem, manicure...)"
            className="pl-10 h-12 border-0 bg-secondary focus-visible:ring-primary"
          />
        </div>
        
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Localização"
            className="pl-10 h-12 border-0 bg-secondary focus-visible:ring-primary"
          />
        </div>
        
        <Button type="submit" size="lg" className="h-12 px-8">
          Buscar
        </Button>
      </div>
    </form>
  );
};

export default SearchBar;
