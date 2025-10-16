import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Edit, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SpecialHoursManager } from "@/components/SpecialHoursManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  is_public: boolean;
  image_url: string | null;
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
  payment_methods?: string[];
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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [newService, setNewService] = useState({ name: "", description: "", price: "", duration_minutes: "", image_url: "", is_public: true });
  const initialTab = searchParams.get('tab') || 'services';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string; appointmentCount: number } | null>(null);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      
      // Filtrar valores em inglês antigos e manter apenas os selecionados em português
      const methods = businessData.payment_methods || [];
      const validMethods = methods.filter((m: string) => 
        ["Dinheiro", "Pix", "Cartão de Crédito", "Cartão de Débito"].includes(m)
      );
      setPaymentMethods(validMethods);
      
      // Se houver valores antigos em inglês, atualizar o banco automaticamente
      if (methods.length > 0 && validMethods.length === 0) {
        await supabase
          .from("businesses")
          .update({ payment_methods: [] })
          .eq("id", businessData.id);
      }
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
      image_url: newService.image_url,
      is_public: newService.is_public
    });

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao adicionar serviço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço adicionado com sucesso!" });
      setNewService({ name: "", description: "", price: "", duration_minutes: "", image_url: "", is_public: true });
      fetchBusinessData();
    }
  };

  const openEditServiceDialog = (service: Service) => {
    setEditingService(service);
    setShowEditDialog(true);
  };

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !business) return;

    setLoading(true);
    const { error } = await supabase
      .from("services")
      .update({
        name: editingService.name,
        description: editingService.description,
        price: editingService.price,
        duration_minutes: editingService.duration_minutes,
        image_url: editingService.image_url,
      })
      .eq("id", editingService.id);

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao atualizar serviço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço atualizado com sucesso!" });
      setShowEditDialog(false);
      setEditingService(null);
      fetchBusinessData();
    }
  };

  const handleEditServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !editingService) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingService({ ...editingService, image_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleServiceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewService({ ...newService, image_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const toggleServiceVisibility = async (serviceId: string, currentPublicStatus: boolean) => {
    const { error } = await supabase
      .from("services")
      .update({ is_public: !currentPublicStatus })
      .eq("id", serviceId);
    
    if (error) {
      toast({ title: "Erro ao atualizar visibilidade", variant: "destructive" });
    } else {
      toast({ title: "Visibilidade atualizada!" });
      fetchBusinessData();
    }
  };

  const openDeleteServiceDialog = async (service: Service) => {
    // Contar agendamentos relacionados
    const { count } = await supabase
      .from("appointment_services")
      .select("*", { count: 'exact', head: true })
      .eq("service_id", service.id);
    
    setServiceToDelete({
      id: service.id,
      name: service.name,
      appointmentCount: count || 0
    });
    setShowDeleteDialog(true);
  };

  const handleInactivateService = async () => {
    if (!serviceToDelete) return;
    
    const { error } = await supabase
      .from("services")
      .update({ is_public: false })
      .eq("id", serviceToDelete.id);
    
    if (error) {
      toast({ title: "Erro ao tornar serviço privado", variant: "destructive" });
    } else {
      toast({ title: "Serviço tornado privado com sucesso" });
      setShowDeleteDialog(false);
      setServiceToDelete(null);
      fetchBusinessData();
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    
    const { error } = await supabase.from("services").delete().eq("id", serviceToDelete.id);
    if (error) {
      toast({ title: "Erro ao deletar serviço", variant: "destructive" });
    } else {
      toast({ title: "Serviço deletado" });
      setShowDeleteDialog(false);
      setServiceToDelete(null);
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
                  <div className="grid gap-2">
                    <Label>Imagem do Serviço (opcional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleServiceImageUpload}
                      className="w-full"
                    />
                    {newService.image_url && (
                      <img src={newService.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newService.is_public}
                      onCheckedChange={(checked) => setNewService({ ...newService, is_public: checked })}
                    />
                    <Label>Serviço Público (visível para todos)</Label>
                  </div>
                  <Button onClick={handleAddService} disabled={loading} className="w-full sm:w-auto min-h-11">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Serviço
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Serviços Cadastrados</h3>
                  {services.map((service) => (
                    <div key={service.id} className="flex flex-col gap-3 p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {service.image_url && (
                          <img src={service.image_url} alt={service.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                          <p className="text-sm mt-1">R$ {service.price} - {service.duration_minutes} min</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Switch
                              checked={service.is_public}
                              onCheckedChange={() => toggleServiceVisibility(service.id, service.is_public)}
                            />
                            <Label className="text-xs">{service.is_public ? "Público" : "Privado"}</Label>
                          </div>
                        </div>
                        {/* Desktop: botões ao lado */}
                        <div className="hidden sm:flex gap-2">
                          <Button variant="destructive" size="sm" className="min-h-11" onClick={() => openDeleteServiceDialog(service)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="min-h-11" onClick={() => openEditServiceDialog(service)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                      {/* Mobile: botões embaixo */}
                      <div className="flex sm:hidden gap-2">
                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteServiceDialog(service)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditServiceDialog(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <Collapsible open={hoursExpanded} onOpenChange={setHoursExpanded}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Horário de Funcionamento</CardTitle>
                      <CardDescription>Configure os dias e horários de atendimento</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${hoursExpanded ? '' : 'rotate-180'}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>
                <CollapsibleContent>
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
                </CollapsibleContent>
                
                <CardContent className="pt-0">
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Dias Específicos</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure horários especiais para datas específicas (feriados, eventos, etc.)
                    </p>
                    {business?.id && <SpecialHoursManager businessId={business.id} />}
                  </div>
                </CardContent>
              </Collapsible>
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

                  <div className="space-y-2 p-4 border rounded-lg">
                    <Label>Métodos de Pagamento</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Selecione os métodos de pagamento aceitos
                    </p>
                    {["Dinheiro", "Pix", "Cartão de Crédito", "Cartão de Débito"].map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={paymentMethods.includes(method)}
                          onChange={(e) => {
                            const newMethods = e.target.checked
                              ? [...paymentMethods, method]
                              : paymentMethods.filter(m => m !== method);
                            setPaymentMethods(newMethods);
                          }}
                          className="rounded"
                        />
                        <Label>{method}</Label>
                      </div>
                    ))}
                    <Button
                      onClick={async () => {
                        setLoading(true);
                        const { error } = await supabase
                          .from("businesses")
                          .update({ payment_methods: paymentMethods })
                          .eq("id", business.id);
                        
                        if (error) {
                          toast({ title: "Erro ao atualizar métodos", variant: "destructive" });
                        } else {
                          toast({ title: "Métodos de pagamento atualizados!" });
                        }
                        setLoading(false);
                      }}
                      disabled={loading}
                      className="mt-2"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Métodos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Service Dialog */}
      {editingService && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
              <DialogDescription>Atualize as informações do serviço</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditService} className="space-y-4">
              <div>
                <Label htmlFor="edit-service-name">Nome do Serviço *</Label>
                <Input
                  id="edit-service-name"
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-service-description">Descrição</Label>
                <Textarea
                  id="edit-service-description"
                  value={editingService.description}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-service-image">Foto do Serviço</Label>
                <Input
                  id="edit-service-image"
                  type="file"
                  accept="image/*"
                  onChange={handleEditServiceImageUpload}
                  className="w-full"
                />
                {editingService.image_url && (
                  <div className="relative mt-2">
                    <img src={editingService.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setEditingService({ ...editingService, image_url: null })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-service-duration">Duração (min) *</Label>
                  <Input
                    id="edit-service-duration"
                    type="number"
                    value={editingService.duration_minutes}
                    onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-service-price">Preço (R$) *</Label>
                  <Input
                    id="edit-service-price"
                    type="number"
                    step="0.01"
                    value={editingService.price}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>Salvar Alterações</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão de serviço</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a excluir o serviço <strong>"{serviceToDelete?.name}"</strong>.</p>
              {serviceToDelete && serviceToDelete.appointmentCount > 0 && (
                <p className="text-destructive font-medium">
                  ⚠️ Existem {serviceToDelete.appointmentCount} agendamento(s) relacionado(s) a este serviço. 
                  Todos esses registros históricos serão apagados permanentemente.
                </p>
              )}
              <p className="mt-4">Você pode optar por apenas tornar o serviço privado, mantendo o histórico preservado.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={handleInactivateService}>
              Apenas Tornar Privado
            </Button>
            <AlertDialogAction onClick={handleDeleteService} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
