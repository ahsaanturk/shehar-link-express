-- AREAS
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views visible areas" ON public.areas FOR SELECT USING (is_visible = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage areas" ON public.areas FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.areas (name, slug, sort_order) VALUES
  ('Chatter & Ambore','chatter-ambore',1),
  ('Narol & Jalalabad','narol-jalalabad',2),
  ('Sathra & Madina Market','sathra-madina',3),
  ('Uper Ada & Plate','uper-ada-plate',4),
  ('Chella','chella',5),
  ('Gojra','gojra',6);

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  show_on_home boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views visible categories" ON public.categories FOR SELECT USING (is_visible = true OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Groceries','grocery','ShoppingBasket',1),
  ('Fruits & Veggies','fruits_veggies','Apple',2),
  ('Fast Food','fast_food','Pizza',3),
  ('Pharmacy','pharmacy','Pill',4),
  ('Restaurants','restaurants','UtensilsCrossed',5),
  ('Beverages','beverages','CupSoda',6),
  ('Home & Lifestyle','home','Home',7),
  ('Meat & Fish','meat','Beef',8),
  ('Sweets & Bakery','sweets','Cake',9);

-- STORE columns
ALTER TABLE public.stores
  ADD COLUMN is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

UPDATE public.stores s SET category_id = c.id FROM public.categories c WHERE c.slug = s.category::text;

-- PRODUCT columns
ALTER TABLE public.products
  ADD COLUMN is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN sort_order int NOT NULL DEFAULT 0;

-- STORE_AREAS link
CREATE TABLE public.store_areas (
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, area_id)
);
ALTER TABLE public.store_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views store areas" ON public.store_areas FOR SELECT USING (true);
CREATE POLICY "Admins manage store areas" ON public.store_areas FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_store_areas_area ON public.store_areas(area_id);
CREATE INDEX idx_stores_category_id ON public.stores(category_id);
CREATE INDEX idx_stores_is_popular ON public.stores(is_popular) WHERE is_popular = true;
CREATE INDEX idx_products_is_popular ON public.products(is_popular) WHERE is_popular = true;

ALTER TABLE public.profiles ADD COLUMN selected_area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;