-- Criar tabela de configurações do app
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir versão inicial
INSERT INTO app_settings (key, value) VALUES ('app_version', '1.0.0');

-- Habilitar RLS (permitir leitura pública)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read access" ON app_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();