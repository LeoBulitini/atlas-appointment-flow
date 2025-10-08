-- Adicionar coluna selling_price na tabela products
ALTER TABLE products
ADD COLUMN selling_price numeric(10,2);