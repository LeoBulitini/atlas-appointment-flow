import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BusinessCard from "@/components/BusinessCard";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateDistance } from "@/lib/distance-utils";
import heroBackgroundImg from "@/assets/hero-background.jpg";
import salonBeautyImg from "@/assets/salon-beauty.jpg";
import barbershopImg from "@/assets/barbershop.jpg";
import spaWellnessImg from "@/assets/spa-wellness.jpg";
import nailSalonImg from "@/assets/nail-salon.jpg";

interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  price_range: string;
  is_active: boolean;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Check if business user is logged in and redirect to dashboard
  useEffect(() => {
    const checkBusinessUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.user_type === 'business') {
            navigate('/dashboard/business');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkBusinessUser();
  }, [navigate]);

  useEffect(() => {
    requestUserLocation();
    fetchBusinesses();

    const channel = supabase
      .channel("businesses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "businesses",
        },
        () => {
          fetchBusinesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const requestUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation denied or error:", error);
        }
      );
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setBusinesses(data || []);
      setFilteredBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm: string, location: string, category: string) => {
    let filtered = [...businesses];

    // Filter by search term (name or category)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.category.toLowerCase().includes(term)
      );
    }

    // Filter by location
    if (location) {
      const loc = location.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.city.toLowerCase().includes(loc) ||
          b.state.toLowerCase().includes(loc) ||
          b.address.toLowerCase().includes(loc)
      );
    }

    // Filter by category
    if (category && category !== "all") {
      filtered = filtered.filter((b) => b.category === category);
    }

    // Sort by proximity if user location is available
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
        const distA = a.latitude && a.longitude
          ? calculateDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
          : Infinity;
        const distB = b.latitude && b.longitude
          ? calculateDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          : Infinity;
        return distA - distB;
      });
    }

    setFilteredBusinesses(filtered);
  };

  const categoryImages: Record<string, string> = {
    "Salão de Beleza": salonBeautyImg,
    "Barbearia": barbershopImg,
    "Spa & Massagem": spaWellnessImg,
    "Estética & Unhas": nailSalonImg,
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBackgroundImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(4px)',
          }}
        />
        <div className="absolute inset-0 z-0 bg-primary/85 dark:bg-primary/75" />
        
        {/* Content */}
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Agende Serviços com Facilidade
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Descubra e agende com os melhores profissionais de beleza e bem-estar perto de você
          </p>
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-bold mb-2">Estabelecimentos em Destaque</h3>
              <p className="text-muted-foreground">
                Os mais bem avaliados na sua região
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Carregando estabelecimentos...</p>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  {businesses.length === 0
                    ? "Nenhum estabelecimento cadastrado ainda"
                    : "Nenhum estabelecimento encontrado com esses filtros"}
                </p>
              </div>
            ) : (
              filteredBusinesses.map((business) => {
                const distance = userLocation && business.latitude && business.longitude
                  ? calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      business.latitude,
                      business.longitude
                    )
                  : undefined;

                return (
                  <BusinessCard
                    key={business.id}
                    id={business.id}
                    name={business.name}
                    category={business.category}
                    address={`${business.address}, ${business.city} - ${business.state}`}
                    image={business.logo_url || categoryImages[business.category] || salonBeautyImg}
                    priceRange={business.price_range}
                    distance={distance}
                  />
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="gradient-primary rounded-2xl p-12 text-center text-white shadow-elegant">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Você é um Profissional ou Empresa?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Cadastre seu negócio no ATLAS e comece a receber agendamentos hoje mesmo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate("/business/setup")}
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-smooth shadow-lg hover:shadow-xl"
              >
                Cadastrar Empresa
              </button>
              <button 
                onClick={() => navigate("/auth")}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-smooth"
              >
                Saiba Mais
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="mb-2 text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ATLAS
          </p>
          <p>&copy; 2025 ATLAS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
