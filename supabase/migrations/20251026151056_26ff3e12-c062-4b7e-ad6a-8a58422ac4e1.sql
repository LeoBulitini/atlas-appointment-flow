-- Remover tabelas se existirem
DROP TABLE IF EXISTS push_notification_logs CASCADE;
DROP TABLE IF EXISTS push_notification_preferences CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;

-- Criar tabela de subscriptions de push
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'desktop')),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_push_subscriptions_unique_endpoint ON push_subscriptions(user_id, ((subscription->>'endpoint')));

-- Criar tabela de logs de notificações
CREATE TABLE push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL
);

CREATE INDEX idx_push_logs_user_id ON push_notification_logs(user_id);
CREATE INDEX idx_push_logs_sent_at ON push_notification_logs(sent_at);

-- Criar tabela de preferências de notificações
CREATE TABLE push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Preferências para Clientes
  appointment_created BOOLEAN DEFAULT true,
  appointment_confirmed BOOLEAN DEFAULT true,
  appointment_reminder BOOLEAN DEFAULT true,
  appointment_rescheduled BOOLEAN DEFAULT true,
  appointment_cancelled BOOLEAN DEFAULT true,
  appointment_completed BOOLEAN DEFAULT true,
  birthday_message BOOLEAN DEFAULT true,
  marketing_messages BOOLEAN DEFAULT true,
  loyalty_updates BOOLEAN DEFAULT true,
  
  -- Preferências para Negócios
  new_appointment BOOLEAN DEFAULT true,
  appointment_changes BOOLEAN DEFAULT true,
  financial_alerts BOOLEAN DEFAULT true,
  stock_alerts BOOLEAN DEFAULT true,
  new_review BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON push_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_preferences_updated_at
  BEFORE UPDATE ON push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();