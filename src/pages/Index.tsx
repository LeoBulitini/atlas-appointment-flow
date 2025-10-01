import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BusinessCard from "@/components/BusinessCard";
import salonBeautyImg from "@/assets/salon-beauty.jpg";
import barbershopImg from "@/assets/barbershop.jpg";
import spaWellnessImg from "@/assets/spa-wellness.jpg";
import nailSalonImg from "@/assets/nail-salon.jpg";
import heroBackgroundImg from "@/assets/hero-background.jpg";

const Index = () => {
  const businesses = [
    {
      id: "1",
      name: "Bella Vista Salon",
      category: "Salão de Beleza",
      rating: 4.8,
      reviewCount: 127,
      address: "Av. Paulista, 1234 - São Paulo, SP",
      image: salonBeautyImg,
      priceRange: "$$",
      openNow: true,
    },
    {
      id: "2",
      name: "The Gentleman's Cut",
      category: "Barbearia",
      rating: 4.9,
      reviewCount: 203,
      address: "Rua Augusta, 567 - São Paulo, SP",
      image: barbershopImg,
      priceRange: "$$$",
      openNow: true,
    },
    {
      id: "3",
      name: "Zen Spa & Wellness",
      category: "Spa & Massagem",
      rating: 4.7,
      reviewCount: 89,
      address: "Rua Oscar Freire, 890 - São Paulo, SP",
      image: spaWellnessImg,
      priceRange: "$$$$",
      openNow: false,
    },
    {
      id: "4",
      name: "Nails & Beauty Studio",
      category: "Estética & Unhas",
      rating: 4.6,
      reviewCount: 156,
      address: "Av. Faria Lima, 2345 - São Paulo, SP",
      image: nailSalonImg,
      priceRange: "$$",
      openNow: true,
    },
  ];

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
            {businesses.map((business) => (
              <BusinessCard key={business.id} {...business} />
            ))}
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
              <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:scale-105 transition-smooth shadow-lg">
                Cadastrar Empresa
              </button>
              <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-smooth">
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
