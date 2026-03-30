
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.banners
  FOR SELECT TO public USING (active = true);

CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'));
