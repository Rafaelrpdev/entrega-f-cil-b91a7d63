CREATE POLICY "Users can update own orders status"
ON public.orders
FOR UPDATE
TO authenticated
USING (customer_id IN (
  SELECT id FROM customers WHERE user_id = auth.uid()
))
WITH CHECK (customer_id IN (
  SELECT id FROM customers WHERE user_id = auth.uid()
));