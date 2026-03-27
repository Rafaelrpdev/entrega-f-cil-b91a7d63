-- Allow admins to delete products
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO public USING (public.has_role(auth.uid(), 'admin'));