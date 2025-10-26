import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, User, Store, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotificationPreferences() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkIfBusinessOwner();
  }, []);

  const checkIfBusinessOwner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      setIsBusinessOwner(!!business);
    } catch (error) {
      console.error('Error checking business owner:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe, criar com padrões
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('push_notification_preferences')
          .insert({
            user_id: user.id
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Erro ao carregar preferências');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_notification_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences({ ...preferences, [key]: value });
      toast.success('Preferência atualizada');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Erro ao atualizar preferência');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          ← Voltar
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Preferências de Notificações
            </h1>
            <p className="text-muted-foreground mt-2">
              Escolha quais notificações você deseja receber
            </p>
          </div>

          {!isBusinessOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Notificações de Cliente
                </CardTitle>
                <CardDescription>
                  Notificações sobre seus agendamentos e recompensas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_created">Agendamento Criado</Label>
                  <Switch
                    id="appointment_created"
                    checked={preferences?.appointment_created}
                    onCheckedChange={(v) => updatePreference('appointment_created', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_confirmed">Agendamento Confirmado</Label>
                  <Switch
                    id="appointment_confirmed"
                    checked={preferences?.appointment_confirmed}
                    onCheckedChange={(v) => updatePreference('appointment_confirmed', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_reminder">Lembretes de Agendamento</Label>
                  <Switch
                    id="appointment_reminder"
                    checked={preferences?.appointment_reminder}
                    onCheckedChange={(v) => updatePreference('appointment_reminder', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_rescheduled">Reagendamentos</Label>
                  <Switch
                    id="appointment_rescheduled"
                    checked={preferences?.appointment_rescheduled}
                    onCheckedChange={(v) => updatePreference('appointment_rescheduled', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_cancelled">Cancelamentos</Label>
                  <Switch
                    id="appointment_cancelled"
                    checked={preferences?.appointment_cancelled}
                    onCheckedChange={(v) => updatePreference('appointment_cancelled', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_completed">Agendamento Concluído</Label>
                  <Switch
                    id="appointment_completed"
                    checked={preferences?.appointment_completed}
                    onCheckedChange={(v) => updatePreference('appointment_completed', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="birthday_message">Mensagem de Aniversário</Label>
                  <Switch
                    id="birthday_message"
                    checked={preferences?.birthday_message}
                    onCheckedChange={(v) => updatePreference('birthday_message', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="marketing_messages">Mensagens de Marketing</Label>
                  <Switch
                    id="marketing_messages"
                    checked={preferences?.marketing_messages}
                    onCheckedChange={(v) => updatePreference('marketing_messages', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="loyalty_updates">Atualizações de Fidelidade</Label>
                  <Switch
                    id="loyalty_updates"
                    checked={preferences?.loyalty_updates}
                    onCheckedChange={(v) => updatePreference('loyalty_updates', v)}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {isBusinessOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Notificações de Negócio
                </CardTitle>
                <CardDescription>
                  Notificações sobre seu estabelecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new_appointment">Novos Agendamentos</Label>
                  <Switch
                    id="new_appointment"
                    checked={preferences?.new_appointment}
                    onCheckedChange={(v) => updatePreference('new_appointment', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="appointment_changes">Alterações em Agendamentos</Label>
                  <Switch
                    id="appointment_changes"
                    checked={preferences?.appointment_changes}
                    onCheckedChange={(v) => updatePreference('appointment_changes', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="financial_alerts">Alertas Financeiros</Label>
                  <Switch
                    id="financial_alerts"
                    checked={preferences?.financial_alerts}
                    onCheckedChange={(v) => updatePreference('financial_alerts', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="stock_alerts">Alertas de Estoque</Label>
                  <Switch
                    id="stock_alerts"
                    checked={preferences?.stock_alerts}
                    onCheckedChange={(v) => updatePreference('stock_alerts', v)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="new_review">Novas Avaliações</Label>
                  <Switch
                    id="new_review"
                    checked={preferences?.new_review}
                    onCheckedChange={(v) => updatePreference('new_review', v)}
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}