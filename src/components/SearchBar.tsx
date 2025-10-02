import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchBarProps {
  onSearch?: (searchTerm: string, location: string, category: string) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm, location, category);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 p-4 bg-card rounded-xl shadow-elegant">
        <div className="flex flex-col md:flex-row gap-3">
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
        
        <div className="w-full md:w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 border-0 bg-secondary">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              <SelectItem value="Salão de Beleza">Salão de Beleza</SelectItem>
              <SelectItem value="Barbearia">Barbearia</SelectItem>
              <SelectItem value="Spa & Massagem">Spa & Massagem</SelectItem>
              <SelectItem value="Estética & Unhas">Estética & Unhas</SelectItem>
              <SelectItem value="Maquiagem">Maquiagem</SelectItem>
              <SelectItem value="Tatuagem">Tatuagem</SelectItem>
              <SelectItem value="Nutricionista">Nutricionista</SelectItem>
              <SelectItem value="Psicologia">Psicologia</SelectItem>
              <SelectItem value="Estúdio de Tatuagem">Estúdio de Tatuagem</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
