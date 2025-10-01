import { Button } from "@/components/ui/button";
import { Calendar, User, Menu, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserType(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUserType(data?.user_type || null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleDashboardClick = () => {
    if (userType === "business") {
      navigate("/dashboard/business");
    } else {
      navigate("/dashboard/client");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="gradient-primary rounded-lg p-2">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ATLAS
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Explorar
            </Button>
            {user ? (
              <>
                <Button variant="ghost" onClick={handleDashboardClick}>
                  Meu Dashboard
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  <User className="mr-2 h-4 w-4" />
                  Entrar
                </Button>
                <Button variant="accent" onClick={() => navigate("/auth")}>
                  Cadastrar
                </Button>
              </>
            )}
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
            <Button variant="ghost" className="justify-start" onClick={() => navigate("/")}>
              Explorar
            </Button>
            {user ? (
              <>
                <Button variant="ghost" className="justify-start" onClick={handleDashboardClick}>
                  Meu Dashboard
                </Button>
                <Button variant="outline" className="justify-start" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="justify-start" onClick={() => navigate("/auth")}>
                  <User className="mr-2 h-4 w-4" />
                  Entrar
                </Button>
                <Button variant="accent" className="justify-start" onClick={() => navigate("/auth")}>
                  Cadastrar
                </Button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
