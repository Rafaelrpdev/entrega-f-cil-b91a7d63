
-- Add stock column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entry', 'exit')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL DEFAULT '',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Admins can manage all stock movements
CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated can view stock movements
CREATE POLICY "Authenticated can view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);

-- Function to handle stock entry
CREATE OR REPLACE FUNCTION public.add_stock_entry(
  _product_id uuid,
  _quantity integer,
  _reason text DEFAULT 'Entrada manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
  VALUES (_product_id, 'entry', _quantity, _reason, auth.uid());
  
  UPDATE products SET stock = stock + _quantity WHERE id = _product_id;
END;
$$;

-- Function to auto-decrement stock when order is delivered
CREATE OR REPLACE FUNCTION public.handle_order_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    INSERT INTO stock_movements (product_id, type, quantity, reason, order_id)
    SELECT oi.product_id, 'exit', oi.quantity, 'Venda - Pedido entregue', NEW.id
    FROM order_items oi WHERE oi.order_id = NEW.id;
    
    UPDATE products p
    SET stock = p.stock - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_delivery();

-- Enable realtime for stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
