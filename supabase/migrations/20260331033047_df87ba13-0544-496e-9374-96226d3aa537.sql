
CREATE TABLE public.store_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  pix_key text NOT NULL DEFAULT '',
  business_hours jsonb NOT NULL DEFAULT '{"monday":{"open":"08:00","close":"18:00","enabled":true},"tuesday":{"open":"08:00","close":"18:00","enabled":true},"wednesday":{"open":"08:00","close":"18:00","enabled":true},"thursday":{"open":"08:00","close":"18:00","enabled":true},"friday":{"open":"08:00","close":"18:00","enabled":true},"saturday":{"open":"08:00","close":"12:00","enabled":true},"sunday":{"open":"","close":"","enabled":false}}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store settings" ON public.store_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage store settings" ON public.store_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_settings (name) VALUES ('Minha Loja');
