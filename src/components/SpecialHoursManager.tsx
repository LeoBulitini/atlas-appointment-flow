import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpecialHour {
  id: string;
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  breaks: { start: string; end: string }[];
  notes: string | null;
}

interface SpecialHoursManagerProps {
  businessId: string;
}

export function SpecialHoursManager({ businessId }: SpecialHoursManagerProps) {
  const { toast } = useToast();
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingDate, setEditingDate] = useState<Date | undefined>();
  const [isClosed, setIsClosed] = useState(false);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (businessId) {
      fetchSpecialHours();
    }
  }, [businessId]);

  const fetchSpecialHours = async () => {
    const { data, error } = await supabase
      .from("business_special_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching special hours:", error);
      return;
    }

    if (data) {
      setSpecialHours(data.map(item => ({
        ...item,
        breaks: (item.breaks as any as { start: string; end: string }[]) || []
      })));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setEditingDate(date);
    
    // Check if there's already a special hour for this date
    const existing = specialHours.find(
      sh => sh.date === format(date, "yyyy-MM-dd")
    );
    
    if (existing) {
      setIsClosed(existing.is_closed);
      setOpenTime(existing.open_time || "09:00");
      setCloseTime(existing.close_time || "18:00");
      setBreaks(existing.breaks || []);
      setNotes(existing.notes || "");
    } else {
      // Reset to defaults
      setIsClosed(false);
      setOpenTime("09:00");
      setCloseTime("18:00");
      setBreaks([]);
      setNotes("");
    }
  };

  const handleSave = async () => {
    if (!editingDate) {
      toast({
        title: "Selecione uma data",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const dateStr = format(editingDate, "yyyy-MM-dd");
    
    const specialHourData = {
      business_id: businessId,
      date: dateStr,
      is_closed: isClosed,
      open_time: isClosed ? null : openTime,
      close_time: isClosed ? null : closeTime,
      breaks: isClosed ? [] : breaks,
      notes: notes || null,
    };

    // Check if already exists
    const existing = specialHours.find(sh => sh.date === dateStr);

    if (existing) {
      const { error } = await supabase
        .from("business_special_hours")
        .update(specialHourData)
        .eq("id", existing.id);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Horário especial atualizado!" });
        fetchSpecialHours();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("business_special_hours")
        .insert(specialHourData);

      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Horário especial salvo!" });
        fetchSpecialHours();
        resetForm();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("business_special_hours")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar",
        variant: "destructive",
      });
    } else {
      toast({ title: "Horário especial removido!" });
      fetchSpecialHours();
    }
  };

  const resetForm = () => {
    setEditingDate(undefined);
    setIsClosed(false);
    setOpenTime("09:00");
    setCloseTime("18:00");
    setBreaks([]);
    setNotes("");
  };

  const addBreak = () => {
    setBreaks([...breaks, { start: "12:00", end: "13:00" }]);
  };

  const removeBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: "start" | "end", value: string) => {
    const newBreaks = [...breaks];
    newBreaks[index][field] = value;
    setBreaks(newBreaks);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Selecione a Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !editingDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editingDate ? format(editingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Escolha uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={editingDate}
                onSelect={handleDateSelect}
                locale={ptBR}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {editingDate && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Fechado neste dia</Label>
              <Switch
                checked={isClosed}
                onCheckedChange={setIsClosed}
              />
            </div>

            {!isClosed && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Abertura</Label>
                    <Input
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fechamento</Label>
                    <Input
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Intervalos</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBreak}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {breaks.map((br, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="time"
                        value={br.start}
                        onChange={(e) => updateBreak(index, "start", e.target.value)}
                        className="flex-1"
                      />
                      <span>até</span>
                      <Input
                        type="time"
                        value={br.end}
                        onChange={(e) => updateBreak(index, "end", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBreak(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Feriado, evento especial, etc."
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Dias Específicos Cadastrados</h3>
        {specialHours.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dia específico configurado ainda.
          </p>
        ) : (
          specialHours.map((sh) => (
            <Card key={sh.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {format(new Date(sh.date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {sh.is_closed ? (
                    <p className="text-sm text-muted-foreground">Fechado</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {sh.open_time} - {sh.close_time}
                      </p>
                      {sh.breaks && sh.breaks.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Intervalos: {sh.breaks.map(br => `${br.start}-${br.end}`).join(", ")}
                        </p>
                      )}
                    </>
                  )}
                  {sh.notes && (
                    <p className="text-sm text-muted-foreground italic">{sh.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(sh.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
