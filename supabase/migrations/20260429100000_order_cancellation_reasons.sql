ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancelled_by_admin boolean DEFAULT false;

COMMENT ON COLUMN public.orders.cancellation_reason IS 'Reason for order cancellation provided by user or admin';
COMMENT ON COLUMN public.orders.cancelled_by_admin IS 'True if the order was cancelled by an admin instead of the user';
