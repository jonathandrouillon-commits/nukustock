-- NukuStock - schéma PostgreSQL / Supabase
create extension if not exists pgcrypto;

create type product_type as enum ('achete','fabrique','modifie');
create type request_status as enum ('brouillon','envoyee','validee','preparation','livree','partielle','annulee');
create type order_status as enum ('brouillon','commandee','en_transit','a_receptionner','recue','annulee');
create type movement_type as enum ('reception','transfert','approvisionnement','inventaire','ajustement','production','consommation');
create type app_role as enum ('admin','stock_manager','service_manager','read_only');

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text, phone text, address text,
  payment_terms text, notes text,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_id uuid references categories(id) on delete set null
);

create table products (
  id uuid primary key default gen_random_uuid(),
  internal_ref text not null unique,
  supplier_ref text,
  name text not null,
  category_id uuid references categories(id),
  brand text, packaging text, unit text not null default 'unite',
  purchase_price numeric(14,2) not null default 0,
  price_updated_at date,
  main_supplier_id uuid references suppliers(id),
  min_stock numeric(14,3) not null default 0,
  photo_url text,
  product_type product_type not null default 'achete',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  location_type text,
  parent_id uuid references locations(id) on delete set null,
  active boolean not null default true
);

create table lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  lot_number text,
  expiry_date date,
  received_at timestamptz,
  unit_cost numeric(14,2),
  supplier_id uuid references suppliers(id),
  created_at timestamptz not null default now()
);

create table stock_balances (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  lot_id uuid not null references lots(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique(product_id,lot_id,location_id)
);

create table supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  supplier_id uuid not null references suppliers(id),
  status order_status not null default 'brouillon',
  bill_of_lading text,
  ordered_at timestamptz,
  expected_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table supplier_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references supplier_orders(id) on delete cascade,
  product_id uuid references products(id),
  description text not null,
  ordered_qty numeric(14,3) not null default 0,
  received_qty numeric(14,3) not null default 0,
  unit_price numeric(14,2) not null default 0
);

create table internal_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  requester_id uuid references auth.users(id),
  service_location_id uuid not null references locations(id),
  source_location_id uuid references locations(id),
  status request_status not null default 'brouillon',
  requested_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table internal_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references internal_requests(id) on delete cascade,
  product_id uuid not null references products(id),
  requested_qty numeric(14,3) not null,
  approved_qty numeric(14,3) not null default 0,
  prepared_qty numeric(14,3) not null default 0,
  delivered_qty numeric(14,3) not null default 0
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type movement_type not null,
  product_id uuid not null references products(id),
  lot_id uuid references lots(id),
  from_location_id uuid references locations(id),
  to_location_id uuid references locations(id),
  quantity numeric(14,3) not null,
  user_id uuid references auth.users(id),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table inventories (
  id uuid primary key default gen_random_uuid(),
  inventory_type text not null,
  location_id uuid references locations(id),
  status text not null default 'open',
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid references auth.users(id)
);

create table inventory_lines (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references inventories(id) on delete cascade,
  product_id uuid not null references products(id),
  lot_id uuid references lots(id),
  theoretical_qty numeric(14,3) not null default 0,
  counted_qty numeric(14,3),
  unit_cost numeric(14,2) not null default 0
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'read_only',
  service_location_id uuid references locations(id),
  active boolean not null default true
);

create table audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_lots_product_expiry on lots(product_id, expiry_date);
create index idx_stock_balances_location on stock_balances(location_id);
create index idx_stock_movements_product_date on stock_movements(product_id, created_at desc);
create index idx_internal_requests_status on internal_requests(status, created_at desc);

-- RLS : à durcir selon les rôles avant mise en production.
alter table products enable row level security;
alter table locations enable row level security;
alter table lots enable row level security;
alter table stock_balances enable row level security;
alter table suppliers enable row level security;
alter table internal_requests enable row level security;
alter table internal_request_items enable row level security;
alter table stock_movements enable row level security;

-- Politique de lecture pour utilisateurs connectés (base de départ).
create policy "authenticated read products" on products for select to authenticated using (true);
create policy "authenticated read locations" on locations for select to authenticated using (true);
create policy "authenticated read lots" on lots for select to authenticated using (true);
create policy "authenticated read stock" on stock_balances for select to authenticated using (true);
create policy "authenticated read suppliers" on suppliers for select to authenticated using (true);
