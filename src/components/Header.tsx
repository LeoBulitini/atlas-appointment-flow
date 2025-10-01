import { Button } from "@/components/ui/button";
import { Calendar, User, Menu } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-2">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ATLAS
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost">Explorar</Button>
            <Button variant="ghost">Para Empresas</Button>
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              Entrar
            </Button>
            <Button variant="accent">Cadastrar</Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="flex flex-col gap-2 py-4 md:hidden">
            <Button variant="ghost" className="justify-start">
              Explorar
            </Button>
            <Button variant="ghost" className="justify-start">
              Para Empresas
            </Button>
            <Button variant="outline" className="justify-start">
              <User className="mr-2 h-4 w-4" />
              Entrar
            </Button>
            <Button variant="accent" className="justify-start">
              Cadastrar
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
