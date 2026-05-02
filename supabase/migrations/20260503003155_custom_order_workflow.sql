-- Add 'rider' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rider';

-- Add rider_id to custom_orders
ALTER TABLE public.custom_orders ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Expand status check for custom_orders
ALTER TABLE public.custom_orders DROP CONSTRAINT IF EXISTS custom_orders_status_check;
ALTER TABLE public.custom_orders ADD CONSTRAINT custom_orders_status_check 
  CHECK (status IN ('pending', 'accepted', 'rejected', 'forwarded', 'picked_up', 'delivered'));

-- Create policy for riders to see assigned custom orders
CREATE POLICY "Riders view assigned custom orders" ON public.custom_orders
  FOR SELECT USING (has_role(auth.uid(), 'rider') AND rider_id = auth.uid());
