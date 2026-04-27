CREATE TABLE public.broadcast_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views notifications"
  ON public.broadcast_notifications FOR SELECT USING (true);

CREATE POLICY "Admins manage notifications"
  ON public.broadcast_notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_broadcast_notifications_updated_at
  BEFORE UPDATE ON public.broadcast_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_broadcast_notifications_created_at ON public.broadcast_notifications(created_at DESC);