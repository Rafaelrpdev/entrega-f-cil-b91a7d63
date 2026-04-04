-- Adicionar a coluna stock à tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0 NOT NULL;

-- Adicionar um comentário para documentação
COMMENT ON COLUMN public.products.stock IS 'Quantidade em estoque do produto';
