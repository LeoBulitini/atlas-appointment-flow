import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BusinessCard from "@/components/BusinessCard";
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
}

const Index = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true)
        .limit(8);

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryImages: Record<string, string> = {
    "Salão de Beleza": salonBeautyImg,
    "Barbearia": barbershopImg,
    "Spa & Massagem": spaWellnessImg,
    "Estética & Unhas": nailSalonImg,
  };

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
        <div className="absolute inset-0 z-0 bg-primary/85" />
        
        {/* Content */}
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Agende Serviços com Facilidade
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Descubra e agende com os melhores profissionais de beleza e bem-estar perto de você
          </p>
          <SearchBar />
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
            ) : businesses.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Nenhum estabelecimento cadastrado ainda</p>
              </div>
            ) : (
              businesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  id={business.id}
                  name={business.name}
                  category={business.category}
                  address={`${business.address}, ${business.city} - ${business.state}`}
                  image={categoryImages[business.category] || salonBeautyImg}
                  priceRange={business.price_range}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold mb-8 text-center">Explore por Categoria</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Cabelo", emoji: "💇" },
              { name: "Barbearia", emoji: "💈" },
              { name: "Unhas", emoji: "💅" },
              { name: "Massagem", emoji: "💆" },
              { name: "Estética", emoji: "✨" },
              { name: "Spa", emoji: "🧖" },
              { name: "Maquiagem", emoji: "💄" },
              { name: "Tatuagem", emoji: "🎨" },
            ].map((category) => (
              <div
                key={category.name}
                className="bg-card p-6 rounded-xl text-center hover:shadow-elegant transition-smooth cursor-pointer group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-smooth">
                  {category.emoji}
                </div>
                <h4 className="font-semibold">{category.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="gradient-primary rounded-2xl p-12 text-center text-white shadow-xl">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Você é um Profissional ou Empresa?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Cadastre seu negócio no ATLAS e comece a receber agendamentos hoje mesmo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate("/business/setup")}
                className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-smooth shadow-lg"
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
