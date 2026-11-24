-- 00 — Tables de base (reconstituées depuis le code de l'appli, absentes des migrations)
create extension if not exists pgcrypto;

create table if not exists public.boutique_codes (
  tenant_id uuid not null, boutique_id text not null, code text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  primary key (tenant_id, boutique_id));

create table if not exists public.category_settings (
  tenant_id uuid not null, category text not null, a_previs boolean not null default false,
  primary key (tenant_id, category));

create table if not exists public.products (
  id text primary key, tenant_id uuid not null, name text not null, category text,
  unit text, usage text default 'both', actif boolean not null default true,
  supply_by_boutique jsonb default '{}'::jsonb,
  prix_cession numeric, pces_per_caisse integer, seuil_stock numeric,
  tourier_actif boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now());

create table if not exists public.sales (
  tenant_id uuid not null, boutique_id text not null, product_id text not null, date date not null,
  matin numeric, aprem numeric, reste_j1 integer, perte integer, rupture_heure text,
  updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, boutique_id, product_id, date));

create table if not exists public.previs (
  tenant_id uuid not null, boutique_id text not null, product_id text not null, service_date date not null,
  qty numeric, updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, boutique_id, product_id, service_date));

create table if not exists public.reappros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, boutique_id text not null, product_id text not null, service_date date not null,
  avoir numeric, commander numeric, previs numeric,
  sent_at timestamptz, qty_livree numeric, livre_at timestamptz, livre_by text, prepared_at timestamptz,
  updated_by text, updated_at timestamptz default now(),
  unique (tenant_id, boutique_id, product_id, service_date));

create table if not exists public.production_defaults (
  tenant_id uuid not null, boutique_id text not null, product_id text not null, day_of_week integer not null,
  default_qty numeric, updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, boutique_id, product_id, day_of_week));

create table if not exists public.production_local (
  tenant_id uuid not null, service_date date not null, product_id text not null,
  produit numeric, stock numeric, updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, service_date, product_id));

create table if not exists public.special_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, origin_shop text, production_shop text,
  customer_name text, customer_phone text, pickup_date date, pickup_time text,
  status text default 'confirmee', notes text,
  created_by text, created_at timestamptz default now(), updated_at timestamptz default now());

create table if not exists public.special_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.special_orders(id) on delete cascade,
  product_id text, product_name_custom text, qty numeric default 1, unit_price numeric,
  notes text, position integer default 0);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, date date not null, tour text, position integer default 0,
  stop_type text, stop_ref text, stop_label text, address text, notes text,
  delivered boolean not null default false, delivered_at timestamptz, delivered_by text,
  updated_by text, updated_at timestamptz default now());

create table if not exists public.livreur_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, sender_boutique text, sender_device text,
  content text, urgent boolean default false, stop_boutique text,
  read_at timestamptz, done boolean default false,
  created_at timestamptz default now());

create table if not exists public.market_entries (
  tenant_id uuid not null, market_id text not null, service_date date not null, product_id text not null,
  marche numeric, commande numeric, commande_tranchee numeric, pertes numeric,
  updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, market_id, service_date, product_id));

create table if not exists public.market_day_notes (
  tenant_id uuid not null, market_id text not null, service_date date not null,
  notes text, updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, market_id, service_date));

create table if not exists public.veigne_pat_stock (
  tenant_id uuid not null, product_id text not null,
  stock numeric default 0, mini numeric, stock_unit text, unit_pieces integer,
  updated_by text, updated_at timestamptz default now(),
  primary key (tenant_id, product_id));

create table if not exists public.stock_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, product_id text not null, qty_real numeric,
  inventoried_at timestamptz default now(), updated_by text);

create table if not exists public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, product_id text not null, qty numeric,
  received_at timestamptz default now(), supplier text, note text, updated_by text);

-- Règle d'origine de l'appli : la clé publique lit et écrit (RLS ouverte)
do $$ declare t text; begin
  foreach t in array array['boutique_codes','category_settings','products','sales','previs','reappros',
    'production_defaults','production_local','special_orders','special_order_items','deliveries',
    'livreur_messages','market_entries','market_day_notes','veigne_pat_stock','stock_inventory','stock_receipts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s all" on public.%I for all using (true) with check (true)', t, t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Temps réel (mêmes tables que celles écoutées par l'appli)
alter publication supabase_realtime add table public.deliveries, public.livreur_messages, public.market_day_notes,
  public.market_entries, public.previs, public.production_local, public.products, public.reappros, public.sales,
  public.special_order_items, public.special_orders;
