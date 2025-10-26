-- Adicionar RLS para tabela de logs (somente leitura para donos dos logs)
ALTER TABLE push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON push_notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs"
  ON push_notification_logs FOR INSERT
  WITH CHECK (true);