-- Tabela de transações financeiras
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  transaction_date DATE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_financial_business ON financial_transactions(business_id);
CREATE INDEX idx_financial_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_type ON financial_transactions(type);

-- RLS Policies
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage their transactions"
  ON financial_transactions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = financial_transactions.business_id 
    AND businesses.owner_id = auth.uid()
  ));

-- Trigger para criar receita automaticamente ao concluir appointment
CREATE OR REPLACE FUNCTION create_revenue_on_appointment_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO financial_transactions (
      business_id,
      type,
      description,
      category,
      amount,
      transaction_date,
      appointment_id
    )
    SELECT 
      NEW.business_id,
      'receita',
      'Serviço: ' || STRING_AGG(services.name, ', '),
      'Serviço',
      SUM(services.price),
      NEW.appointment_date,
      NEW.id
    FROM appointment_services
    JOIN services ON services.id = appointment_services.service_id
    WHERE appointment_services.appointment_id = NEW.id
    GROUP BY NEW.business_id, NEW.appointment_date, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_revenue
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_revenue_on_appointment_completion();

-- Tabela de produtos para estoque
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL,
  cost_price DECIMAL(10,2),
  current_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de movimentações de estoque
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  movement_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para estoque
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);

-- RLS Policies para produtos
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage products"
  ON products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = products.business_id 
    AND businesses.owner_id = auth.uid()
  ));

-- RLS Policies para movimentações
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage stock movements"
  ON stock_movements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = stock_movements.business_id 
    AND businesses.owner_id = auth.uid()
  ));

-- Trigger para atualizar quantidade do produto
CREATE OR REPLACE FUNCTION update_product_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE products 
    SET current_quantity = current_quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.type = 'saida' THEN
    UPDATE products 
    SET current_quantity = current_quantity - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_quantity
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity();

-- Configuração do programa de fidelidade
CREATE TABLE loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  program_type TEXT NOT NULL CHECK (program_type IN ('pontos', 'visitas')),
  points_per_real DECIMAL(10,2) DEFAULT 1.0,
  points_required INTEGER,
  reward_value DECIMAL(10,2),
  visits_required INTEGER,
  reward_services UUID[],
  qualifying_services UUID[],
  points_validity_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saldo de pontos/visitas por cliente
CREATE TABLE loyalty_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, client_id)
);

-- Histórico de movimentações de fidelidade
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ganho', 'uso', 'expiracao', 'ajuste')),
  points_change INTEGER DEFAULT 0,
  visits_change INTEGER DEFAULT 0,
  description TEXT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para fidelidade
CREATE INDEX idx_loyalty_programs_business ON loyalty_programs(business_id);
CREATE INDEX idx_loyalty_balances_business ON loyalty_balances(business_id);
CREATE INDEX idx_loyalty_balances_client ON loyalty_balances(client_id);
CREATE INDEX idx_loyalty_transactions_business ON loyalty_transactions(business_id);

-- RLS Policies para programa de fidelidade
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage loyalty programs"
  ON loyalty_programs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = loyalty_programs.business_id 
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Clients view active programs"
  ON loyalty_programs FOR SELECT
  USING (is_active = true);

-- RLS para saldos
ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view balances"
  ON loyalty_balances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = loyalty_balances.business_id 
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners update balances"
  ON loyalty_balances FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = loyalty_balances.business_id 
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Clients view own balance"
  ON loyalty_balances FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "System can manage balances"
  ON loyalty_balances FOR ALL
  USING (true);

-- RLS para transações
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage transactions"
  ON loyalty_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses 
    WHERE businesses.id = loyalty_transactions.business_id 
    AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Clients view own transactions"
  ON loyalty_transactions FOR SELECT
  USING (client_id = auth.uid());

-- Trigger para adicionar pontos/visitas ao concluir appointment
CREATE OR REPLACE FUNCTION add_loyalty_points_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  program RECORD;
  total_amount DECIMAL(10,2);
  points_to_add INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT * INTO program 
    FROM loyalty_programs 
    WHERE business_id = NEW.business_id AND is_active = true;
    
    IF FOUND THEN
      IF program.program_type = 'pontos' THEN
        SELECT COALESCE(SUM(services.price), 0) INTO total_amount
        FROM appointment_services
        JOIN services ON services.id = appointment_services.service_id
        WHERE appointment_services.appointment_id = NEW.id;
        
        points_to_add := FLOOR(total_amount * program.points_per_real);
        
        INSERT INTO loyalty_balances (business_id, client_id, points)
        VALUES (NEW.business_id, NEW.client_id, points_to_add)
        ON CONFLICT (business_id, client_id) 
        DO UPDATE SET 
          points = loyalty_balances.points + points_to_add,
          updated_at = NOW();
        
        INSERT INTO loyalty_transactions (
          business_id, client_id, type, points_change, 
          description, appointment_id, expires_at
        ) VALUES (
          NEW.business_id, NEW.client_id, 'ganho', points_to_add,
          'Pontos ganhos no agendamento', NEW.id,
          CASE WHEN program.points_validity_days IS NOT NULL 
            THEN NOW() + (program.points_validity_days || ' days')::INTERVAL 
            ELSE NULL END
        );
        
      ELSIF program.program_type = 'visitas' THEN
        IF program.qualifying_services IS NULL OR 
           EXISTS (
             SELECT 1 FROM appointment_services
             WHERE appointment_id = NEW.id 
             AND service_id = ANY(program.qualifying_services)
           ) THEN
          
          INSERT INTO loyalty_balances (business_id, client_id, visits)
          VALUES (NEW.business_id, NEW.client_id, 1)
          ON CONFLICT (business_id, client_id) 
          DO UPDATE SET 
            visits = loyalty_balances.visits + 1,
            updated_at = NOW();
          
          INSERT INTO loyalty_transactions (
            business_id, client_id, type, visits_change, 
            description, appointment_id
          ) VALUES (
            NEW.business_id, NEW.client_id, 'ganho', 1,
            'Visita registrada', NEW.id
          );
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_loyalty_points
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION add_loyalty_points_on_completion();