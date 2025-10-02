import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  price_range: string;
  opening_hours: any;
  auto_confirm_appointments?: boolean;
  logo_url?: string;
}

interface PortfolioItem {
  id: string;
  media_type: string;
  media_data: string;
  description: string;
  display_order: number;
}

interface OpeningHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    breaks: { start: string; end: string }[];
  };
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES: { [key: string]: string } = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

export default function BusinessSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [newService, setNewService] = useState({ name: "", description: "", price: "", duration_minutes: "" });
  const [activeTab, setActiveTab] = useState("services");

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (businessData) {
      setBusiness(businessData);
      const hours = businessData.opening_hours as OpeningHours | null;
      setOpeningHours(hours || getDefaultOpeningHours());
    }

    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessData?.id)
      .order("created_at", { ascending: false });

    if (servicesData) setServices(servicesData);

    const { data: portfolioData } = await supabase
      .from("business_portfolio")
      .select("*")
      .eq("business_id", businessData?.id)
      .order("display_order", { ascending: true });

    if (portfolioData) setPortfolio(portfolioData);
  };

  const getDefaultOpeningHours = (): OpeningHours => {
    const defaults: OpeningHours = {};
    DAYS.forEach(day => {
      defaults[day] = {
        isOpen: day !== 'sunday',
        openTime: '09:00',
        closeTime: '18:00',
        breaks: []
      };
    });
    return defaults;
  };

  const handleAddService = async () => {
    if (!business || !newService.name || !newService.price || !newService.duration_minutes) {
      toast({ title: "Preencha todos os campos do serviço", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("services").insert({
      business_id: business.id,
      name: newService.name,
      description: newService.description,
      price: parseFloat(newService.price),
      duration_minutes: parseInt(newService.duration_minutes),
      is_active: true
    });

    if (error) {
      toast({ title: "Erro ao adicionar serviço", variant: "destructive" });
    } else {
      toast({ title: "Serviço adicionado com sucesso!" });
      setNewService({ name: "", description: "", price: "", duration_minutes: "" });
      fetchBusinessData();
    }
    setLoading(false);
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao deletar serviço", variant: "destructive" });
    } else {
      toast({ title: "Serviço deletado" });
      fetchBusinessData();
    }
  };

  const handleSaveOpeningHours = async () => {
    if (!business) return;
    setLoading(true);
    const { error } = await supabase
      .from("businesses")
      .update({ opening_hours: openingHours })
      .eq("id", business.id);

    if (error) {
      toast({ title: "Erro ao salvar horários", variant: "destructive" });
    } else {
      toast({ title: "Horários salvos com sucesso!" });
    }
    setLoading(false);
  };

  const handleAddBreak = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [...(prev[day]?.breaks || []), { start: '12:00', end: '13:00' }]
      }
    }));
  };

  const handleRemoveBreak = (day: string, index: number) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.filter((_, i) => i !== index)
      }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!business || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setLoading(true);
      const { error } = await supabase.from("business_portfolio").insert({
        business_id: business.id,
        media_type: file.type.startsWith('image/') ? 'image' : 'video',
        media_data: base64,
        description: '',
        display_order: portfolio.length
      });

      if (error) {
        toast({ title: "Erro ao adicionar mídia", variant: "destructive" });
      } else {
        toast({ title: "Mídia adicionada com sucesso!" });
        fetchBusinessData();
      }
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDeletePortfolio = async (id: string) => {
    const { error } = await supabase.from("business_portfolio").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao deletar mídia", variant: "destructive" });
    } else {
      toast({ title: "Mídia deletada" });
      fetchBusinessData();
    }
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!business) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        postal_code: formData.get('postal_code') as string,
        price_range: formData.get('price_range') as string
      })
      .eq("id", business.id);

    if (error) {
      toast({ title: "Erro ao atualizar informações", variant: "destructive" });
    } else {
      toast({ title: "Informações atualizadas com sucesso!" });
      fetchBusinessData();
    }
    setLoading(false);
  };

  if (!business) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/dashboard/business")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">Configurações</h1>

        {/* Mobile: Select Dropdown */}
        {isMobile && (
          <div className="mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="services">Serviços</SelectItem>
                <SelectItem value="hours">Horários</SelectItem>
                <SelectItem value="portfolio">Portfólio</SelectItem>
                <SelectItem value="info">Informações</SelectItem>
                <SelectItem value="settings">Configurações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop: Tab List */}
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="hours">Horários</TabsTrigger>
              <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Serviços</CardTitle>
                <CardDescription>Adicione e gerencie os serviços oferecidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Nome do Serviço</Label>
                    <Input
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="Ex: Corte de Cabelo"
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="Descrição do serviço"
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={newService.price}
                        onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                        placeholder="50.00"
                        className="w-full"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Duração (minutos)</Label>
                      <Input
                        type="number"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })}
                        placeholder="60"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddService} disabled={loading} className="w-full sm:w-auto min-h-11">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Serviço
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Serviços Cadastrados</h3>
                  {services.map((service) => (
                    <div key={service.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <p className="text-sm mt-1">R$ {service.price} - {service.duration_minutes} min</p>
                      </div>
                      <Button variant="destructive" size="sm" className="min-h-11 w-full sm:w-auto" onClick={() => handleDeleteService(service.id)}>
                        <Trash2 className="h-4 w-4 mr-2 sm:mr-0" />
                        <span className="sm:hidden">Excluir</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>Configure os dias e horários de atendimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {DAYS.map((day) => (
                  <div key={day} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{DAY_NAMES[day]}</Label>
                      <Switch
                        checked={openingHours[day]?.isOpen ?? false}
                        onCheckedChange={(checked) =>
                          setOpeningHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day], isOpen: checked }
                          }))
                        }
                      />
                    </div>
                    {openingHours[day]?.isOpen && (
                      <div className="space-y-4 pl-0 sm:pl-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Abertura</Label>
                            <Input
                              type="time"
                              value={openingHours[day]?.openTime || '09:00'}
                              onChange={(e) =>
                                setOpeningHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], openTime: e.target.value }
                                }))
                              }
                              className="w-full"
                            />
                          </div>
                          <div>
                            <Label>Fechamento</Label>
                            <Input
                              type="time"
                              value={openingHours[day]?.closeTime || '18:00'}
                              onChange={(e) =>
                                setOpeningHours(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], closeTime: e.target.value }
                                }))
                              }
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <Label>Pausas</Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddBreak(day)}
                              className="w-full sm:w-auto"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Pausa
                            </Button>
                          </div>
                          {openingHours[day]?.breaks?.map((breakTime, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                              <Input
                                type="time"
                                value={breakTime.start}
                                onChange={(e) => {
                                  const newBreaks = [...openingHours[day].breaks];
                                  newBreaks[index].start = e.target.value;
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], breaks: newBreaks }
                                  }));
                                }}
                                className="flex-1"
                              />
                              <span className="text-center sm:text-left">até</span>
                              <Input
                                type="time"
                                value={breakTime.end}
                                onChange={(e) => {
                                  const newBreaks = [...openingHours[day].breaks];
                                  newBreaks[index].end = e.target.value;
                                  setOpeningHours(prev => ({
                                    ...prev,
                                    [day]: { ...prev[day], breaks: newBreaks }
                                  }));
                                }}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveBreak(day, index)}
                                className="w-full sm:w-auto min-h-11"
                              >
                                <Trash2 className="h-4 w-4 mr-2 sm:mr-0" />
                                <span className="sm:hidden">Remover</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={handleSaveOpeningHours} disabled={loading} className="w-full sm:w-auto min-h-11">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Horários
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card>
              <CardHeader>
                <CardTitle>Portfólio</CardTitle>
                <CardDescription>Adicione fotos e vídeos dos seus trabalhos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Adicionar Mídia</Label>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolio.map((item) => (
                    <div key={item.id} className="relative group">
                      {item.media_type === 'image' ? (
                        <img src={item.media_data} alt="Portfolio" className="w-full h-48 object-cover rounded-lg" />
                      ) : (
                        <video src={item.media_data} className="w-full h-48 object-cover rounded-lg" controls />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePortfolio(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>Atualize os dados da sua empresa</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nome da Empresa</Label>
                    <Input name="name" defaultValue={business.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição</Label>
                    <Textarea name="description" defaultValue={business.description || ''} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select name="category" defaultValue={business.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Telefone</Label>
                      <Input name="phone" defaultValue={business.phone} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>E-mail</Label>
                      <Input name="email" type="email" defaultValue={business.email || ''} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Endereço</Label>
                    <Input name="address" defaultValue={business.address} required />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Cidade</Label>
                      <Input name="city" defaultValue={business.city} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Estado</Label>
                      <Input name="state" defaultValue={business.state} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>CEP</Label>
                      <Input name="postal_code" defaultValue={business.postal_code || ''} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Faixa de Preço</Label>
                    <Select name="price_range" defaultValue={business.price_range}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$">$ - Econômico</SelectItem>
                        <SelectItem value="$$">$$ - Moderado</SelectItem>
                        <SelectItem value="$$$">$$$ - Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Informações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Configure as opções da sua empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Confirmação Automática de Agendamentos</Label>
                      <p className="text-sm text-muted-foreground">
                        Quando ativado, todos os agendamentos serão confirmados automaticamente sem precisar de sua aprovação
                      </p>
                    </div>
                    <Switch
                      checked={business.auto_confirm_appointments || false}
                      onCheckedChange={async (checked) => {
                        setLoading(true);
                        const { error } = await supabase
                          .from("businesses")
                          .update({ auto_confirm_appointments: checked })
                          .eq("id", business.id);
                        
                        if (error) {
                          toast({ title: "Erro ao atualizar configuração", variant: "destructive" });
                        } else {
                          toast({ title: "Configuração atualizada com sucesso!" });
                          fetchBusinessData();
                        }
                        setLoading(false);
                      }}
                    />
                  </div>

                  <div className="space-y-2 p-4 border rounded-lg">
                    <Label>Logo/Foto da Empresa</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Esta foto será exibida na página de explorar estabelecimentos
                    </p>
                    {business.logo_url && (
                      <div className="mb-4">
                        <img 
                          src={business.logo_url} 
                          alt="Logo da empresa" 
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          setLoading(true);
                          const { error } = await supabase
                            .from("businesses")
                            .update({ logo_url: base64 })
                            .eq("id", business.id);
                          
                          if (error) {
                            toast({ title: "Erro ao atualizar logo", variant: "destructive" });
                          } else {
                            toast({ title: "Logo atualizada com sucesso!" });
                            fetchBusinessData();
                          }
                          setLoading(false);
                        };
                        
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
