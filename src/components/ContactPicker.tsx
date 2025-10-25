import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Users, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Contact {
  name: string;
  phone: string;
}

interface ContactPickerProps {
  onSelect: (contact: Contact) => void;
}

export function ContactPicker({ onSelect }: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar se a API de Contatos está disponível
    if ('contacts' in navigator && 'ContactsManager' in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchTerm, contacts]);

  const requestContacts = async () => {
    setLoading(true);
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      
      // @ts-ignore - ContactsManager API ainda não tem tipagem completa
      const contactsList = await navigator.contacts.select(props, opts);
      
      const formattedContacts: Contact[] = contactsList
        .filter((c: any) => c.name && c.tel && c.tel.length > 0)
        .map((c: any) => ({
          name: c.name[0] || "",
          phone: c.tel[0] || "",
        }));

      setContacts(formattedContacts);
      setFilteredContacts(formattedContacts);
      
      if (formattedContacts.length === 0) {
        toast.error("Nenhum contato encontrado");
      }
    } catch (error) {
      console.error("Erro ao acessar contatos:", error);
      toast.error("Erro ao acessar contatos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (isSupported && contacts.length === 0) {
      requestContacts();
    }
  };

  const handleSelectContact = (contact: Contact) => {
    onSelect(contact);
    setOpen(false);
    setSearchTerm("");
    toast.success(`Contato ${contact.name} selecionado`);
  };

  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          toast.info("Acesso a contatos não disponível neste navegador");
        }}
        disabled
      >
        <Users className="mr-2 h-4 w-4" />
        Selecionar Contato
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
      >
        <Users className="mr-2 h-4 w-4" />
        Selecionar Contato
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Contato</DialogTitle>
            <DialogDescription>
              Escolha um contato do seu dispositivo
            </DialogDescription>
          </DialogHeader>

          {contacts.length === 0 && !loading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Clique em "Permitir Acesso" quando solicitado pelo navegador para visualizar seus contatos.
              </AlertDescription>
            </Alert>
          )}

          {contacts.length > 0 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contact.phone}
                          </div>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum contato encontrado
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
