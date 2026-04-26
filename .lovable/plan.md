
# SheharLink — Build Plan (v1)

Hyper-local delivery PWA for **Muzaffarabad, Azad Kashmir**. Categories: Groceries, Fruits & Vegetables, Fast Food. Cash on Delivery only.

**Roles:** Customer + Admin (Admin performs all merchant + rider duties in v1).

---

## Stack (adapted to Lovable)

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + React Router
- **Data fetching:** TanStack Query + Supabase Realtime (push updates beat polling on 3G)
- **Backend:** Lovable Cloud (Postgres + Auth + Edge Functions + Storage)
- **Auth:** Email + password
- **PWA:** Manifest + icons only (installable, no service worker — keeps Lovable preview safe)

---

## Design system

- **Primary:** Emerald green `#10b981` (set as HSL token `--primary`)
- **Background:** Off-white `#fafaf9`, cards white, borders soft gray
- **Typography:** Inter, large tap targets (min 44px) for action buttons
- **Status badges (color-coded):**
  - Pending → Yellow
  - Preparing → Blue
  - Picked Up → Purple
  - Delivered → Green
  - Cancelled → Red
- **Mobile-first:** sticky bottom nav for customer (Home / Orders / Cart / Profile), generous spacing, compressed images via Storage transformations

---

## Database (Postgres on Lovable Cloud)

All tables get RLS. Roles live in a separate `user_roles` table (security best practice — never on profiles).

1. **profiles** — `id (= auth.users.id)`, `name`, `phone`, `address`, `created_at`
2. **user_roles** — `id`, `user_id`, `role` (`'customer' | 'admin'`)
3. **stores** — `id`, `name`, `owner_id`, `category` (`'grocery' | 'fruits_veggies' | 'fast_food'`), `image_url`, `is_active`
4. **products** — `id`, `store_id`, `name`, `price`, `image_url`, `is_available`
5. **orders** — `id (uuid)`, `short_id` (e.g. `SL-1029`, auto-generated via sequence), `customer_id`, `store_id`, `assigned_admin_id` (nullable), `items` (jsonb: `[{product_id, name, qty, price}]`), `total_amount`, `delivery_fee`, `status`, `customer_address`, `customer_phone`, `created_at`
6. **order_history** — `id`, `order_id`, `status`, `changed_by`, `timestamp`
7. **storage buckets:** `store-images`, `product-images` (public read)

**Security:**
- RLS so customers see only their own orders; admins see everything via `has_role(auth.uid(), 'admin')` security-definer function
- Race-condition-safe claim: Edge Function runs `UPDATE orders SET assigned_admin_id = $me, status = 'picked_up' WHERE id = $id AND assigned_admin_id IS NULL RETURNING *` — atomic, no double-claim possible
- Trigger on `orders.status` change → insert into `order_history` automatically

---

## Pages & flows

### A. Customer app (mobile-first)

- **`/`** — Home: SheharLink logo + "Muzaffarabad" pin, search bar, category tiles (Grocery / Fruits & Veggies / Fast Food), horizontal-scroll rails: "Popular Stores", "Near You"
- **`/store/:id`** — Store page: header image, product grid with `+ / −` qty controls; floating "View Cart (Rs. xxx)" pill
- **`/cart`** — Line items, subtotal, delivery fee, **payment: COD (locked)**, address + phone form, "Place Order" → creates order with status `pending`
- **`/orders`** — List of customer's orders with status badges
- **`/orders/:id`** — Big `SL-1029` display, **visual timeline**: Pending → Preparing → Picked Up → Delivered (filled in green as it progresses), live-updates via Realtime, customer address + items recap
- **`/auth`** — Sign up / log in (email + password); first signup auto-assigned `customer` role

### B. Admin portal (god mode)

- **`/admin`** — Dashboard: today's order count, revenue, pending count, active deliveries
- **`/admin/orders`** — Live feed (Realtime). Filter by status. Click row → drawer with full details + status action buttons: **Accept (→ preparing)**, **Mark Picked Up**, **Mark Delivered**, **Cancel**
- **`/admin/stores`** — CRUD stores (name, category, image upload to Storage)
- **`/admin/products`** — Per-store product list with **toggle switch** for `is_available` (instant DB update), add/edit/delete products
- **`/admin/settlements`** — Daily view: total COD collected today, breakdown by store, total delivery fees, totals — exportable as CSV
- **WhatsApp fallback:** every order detail view has a **"Share to WhatsApp"** button that copies order summary (short id, address, items, phone, total) and opens `https://wa.me/?text=...` for coordination when internet is flaky

### C. Auth & route protection

- `<ProtectedRoute role="admin">` gate around `/admin/*`
- Customer routes require login except `/` browse
- Logout in profile menu

---

## PWA setup

- `public/manifest.json` with name, short_name `SheharLink`, theme color `#10b981`, `display: "standalone"`, icons (192, 512)
- Apple touch icon + meta tags in `index.html`
- **No service worker** — installable + standalone display, but no offline cache (avoids preview interference)

---

## Build order (you'll review after each)

1. **Foundation:** design tokens (emerald green), Tailwind setup, PWA manifest, app shell with bottom nav, route skeleton
2. **Lovable Cloud setup:** all tables, RLS policies, `has_role` function, storage buckets, short-id sequence, status-history trigger
3. **Auth:** signup/login pages, auto-assign customer role, protected route component, admin role bootstrap (we'll seed your admin account)
4. **Customer flow:** Home → Store → Cart → Place Order → Track Order (with Realtime timeline)
5. **Admin orders:** live order feed + status transitions + WhatsApp share + race-safe claim Edge Function
6. **Admin catalog:** stores CRUD + products CRUD + availability toggle + image uploads
7. **Admin settlements:** daily totals view + CSV export
8. **Polish pass:** empty states, loading skeletons, error toasts, mobile QA at 360px

---

## Notes / deferrals for v2

- Separate Merchant + Rider portals (currently folded into Admin)
- Phone OTP login (needs SMS provider — easy migration later)
- Live GPS tracking for riders
- Push notifications (requires service worker — revisit when published)
- Multi-language (Urdu)

Approve and I'll start with **Step 1 (foundation + design tokens + PWA manifest + app shell)**.
