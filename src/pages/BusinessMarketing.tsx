import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  MessageCircle,
  RefreshCw,
  Calendar,
  Clock,
  Gift,
  Heart,
  Users,
  Sparkles,
  Link as LinkIcon,
  Cake,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { MessageTemplateDialog } from "@/components/MessageTemplateDialog";
import { hasRequiredFields } from "@/lib/marketing-utils";

interface MessageTemplate {
  id: string;
  title: string;
  icon: any;
  category: string;
  message: string;
  fields: string[];
  color: string;
}

const BusinessMarketing = () => {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const bookingLink = business ? `${window.location.origin}/booking/${business.id}` : "";

  const templates: MessageTemplate[] = [
    {
      id: "convite-retorno",
      title: "Convite para Retorno",
      icon: RefreshCw,
      category: "Engajamento",
      color: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
      message: `Olá! 😊

Saudades de você por aqui! Faz um tempinho que não nos vemos... 

Que tal marcar um horário? Estou com a agenda aberta e adoraria te atender novamente! ✨

Me chama aqui mesmo pra gente combinar! 💙`,
      fields: [],
    },
    {
      id: "vagas-hoje",
      title: "Vagas Disponíveis Hoje",
      icon: Clock,
      category: "Urgência",
      color: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20",
      message: `Oi! ⚡

Olha só, ainda tenho [X] horários disponíveis HOJE:

🕐 [HORÁRIO 1]
🕑 [HORÁRIO 2]
🕒 [HORÁRIO 3]

Aproveita! Me chama rápido pra garantir o seu! 😉`,
      fields: ["[X]", "[HORÁRIO 1]", "[HORÁRIO 2]", "[HORÁRIO 3]"],
    },
    {
      id: "horarios-semana",
      title: "Horários Vagos na Semana",
      icon: Calendar,
      category: "Planejamento",
      color: "bg-green-500/10 border-green-500/20 hover:bg-green-500/20",
      message: `Oi! 📅

Essa semana ainda tem horários livres:

[HORÁRIOS]

Qual dia é melhor pra você? Me chama! 💚`,
      fields: ["[HORÁRIOS]"],
    },
    {
      id: "lembrete-agendamento",
      title: "Lembrete de Agendamento",
      icon: MessageCircle,
      category: "Lembrete",
      color: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20",
      message: `Oi! ⏰

Só passando pra lembrar do seu agendamento:

📅 [DATA]
🕐 Às [HORA]
✨ [SERVIÇO]

Qualquer coisa é só chamar! Te espero 💜`,
      fields: ["[DATA]", "[HORA]", "[SERVIÇO]"],
    },
    {
      id: "oferta-promocao",
      title: "Oferta/Promoção",
      icon: Gift,
      category: "Promoção",
      color: "bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20",
      message: `Olá! 🎁

Tenho uma novidade pra você:

✨ [DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]

⏰ Válido até [DATA]

Aproveita! Me chama pra agendar! 💖`,
      fields: ["[DESCRIÇÃO DA PROMOÇÃO/NOVIDADE]", "[DATA]"],
    },
    {
      id: "agradecimento",
      title: "Agradecimento Pós-Atendimento",
      icon: Heart,
      category: "Relacionamento",
      color: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20",
      message: `Oi! 💙

Muito obrigado(a) por ter vindo hoje! Espero que tenha gostado do resultado! ✨

Se precisar de alguma coisa ou quiser agendar de novo, é só chamar! 

Até a próxima! 😊`,
      fields: [],
    },
    {
      id: "pedido-indicacao",
      title: "Pedido de Indicação",
      icon: Users,
      category: "Relacionamento",
      color: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20",
      message: `Oi! 💙

Você sempre foi um cliente especial por aqui!

Se conhecer alguém que precise dos meus serviços, pode indicar? Vou cuidar super bem! 🌟

Obrigado(a) pela confiança! 😊`,
      fields: [],
    },
    {
      id: "novo-servico",
      title: "Novo Serviço Disponível",
      icon: Sparkles,
      category: "Novidade",
      color: "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20",
      message: `Oi! ✨

Comecei a fazer [NOVO SERVIÇO]! Acho que você vai gostar! 💫

Valor: [VALOR]
Duração: [TEMPO]

Me chama pra agendar e conhecer! 🎉`,
      fields: ["[NOVO SERVIÇO]", "[VALOR]", "[TEMPO]"],
    },
    {
      id: "link-agendamento",
      title: "Link Direto de Agendamento",
      icon: LinkIcon,
      category: "Facilitador",
      color: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20",
      message: `Olá! 👋

Para facilitar, você pode agendar direto por esse link:

🔗 ${bookingLink}

Escolha o melhor dia e horário pra você! 

Qualquer dúvida é só chamar! 😊`,
      fields: [],
    },
    {
      id: "aniversario",
      title: "Cliente Aniversariante",
      icon: Cake,
      category: "Especial",
      color: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20",
      message: `🎉 FELIZ ANIVERSÁRIO! 🎂

Desejo um dia incrível cheio de alegrias!

Como presente, preparei uma surpresa especial pra você! 🎁

Me chama que vou te contar! 💝`,
      fields: [],
    },
  ];

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  const openWhatsApp = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleTemplateAction = (template: MessageTemplate, action: 'copy' | 'whatsapp') => {
    // Se o template não tem campos obrigatórios ou é o link de agendamento, executar diretamente
    if (template.fields.length === 0 || template.id === 'link-agendamento') {
      if (action === 'copy') {
        copyToClipboard(template.message, template.id);
      } else {
        openWhatsApp(template.message);
      }
      return;
    }

    // Se tem campos, abrir o dialog
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/business")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketing & Comunicação</h1>
            <p className="text-muted-foreground">Templates prontos para comunicação com seus clientes</p>
          </div>
        </div>

        {/* Booking Link Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Link de Agendamento
            </CardTitle>
            <CardDescription>
              Compartilhe este link para seus clientes agendarem facilmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-background rounded-md border text-sm break-all">
                {bookingLink}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(bookingLink, "booking-link")}
              >
                {copiedId === "booking-link" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Collapsible className="mb-6">
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Dicas de Uso
                  </div>
                  <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div>
                  <h4 className="font-semibold mb-2">📝 Como usar</h4>
                  <p className="text-sm text-muted-foreground">
                    Para mensagens que precisam de informações específicas (datas, horários, serviços), o sistema irá solicitar que você selecione ou preencha os dados necessários antes de copiar ou enviar.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">⏰ Melhores horários</h4>
                  <p className="text-sm text-muted-foreground">
                    Evite enviar mensagens muito cedo (antes das 9h) ou muito tarde (após 21h). O melhor horário é entre 10h e 19h.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🎯 Frequência recomendada</h4>
                  <p className="text-sm text-muted-foreground">
                    Não envie mensagens todos os dias para o mesmo cliente. Respeite um intervalo de pelo menos 1 semana entre contatos promocionais.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className={`${template.color} transition-all`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background/50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">{template.message}</p>
                  </div>
                  
                  {template.fields.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {template.fields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleTemplateAction(template, 'copy')}
                    >
                      {copiedId === template.id ? (
                        <>
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar
                        </>
                      )}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => handleTemplateAction(template, 'whatsapp')}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Dialog para templates com campos */}
        {selectedTemplate && business && (
          <MessageTemplateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            template={selectedTemplate}
            businessId={business.id}
            onCopy={(message) => copyToClipboard(message, selectedTemplate.id)}
            onWhatsApp={openWhatsApp}
          />
        )}
      </div>
    </div>
  );
};

export default BusinessMarketing;
