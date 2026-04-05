-- ============================================================
-- Tabelas de Saúde Financeira — Revenda de Gás
-- ============================================================

-- Receitas manuais (complementa os pedidos existentes)
create table if not exists financial_revenues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  data date not null default current_date,
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  categoria text not null default 'outros',
  produto text,
  quantidade numeric(10,3)
);

-- Despesas operacionais
create table if not exists financial_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  data date not null default current_date,
  descricao text not null,
  valor numeric(12,2) not null check (valor > 0),
  categoria text not null default 'outros'
);

-- Dívidas pendentes
create table if not exists financial_debts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  credor text not null,
  descricao text,
  valor_total numeric(12,2) not null check (valor_total > 0),
  valor_pago numeric(12,2) not null default 0,
  valor_restante numeric(12,2) generated always as (valor_total - valor_pago) stored,
  data_vencimento date,
  quitada boolean not null default false
);

-- Metas de vendas e faturamento
create table if not exists financial_goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome_meta text not null,
  tipo text not null default 'faturamento', -- 'faturamento' | 'lucro' | 'quantidade'
  valor_meta numeric(12,2) not null check (valor_meta > 0),
  periodo text not null default 'mensal', -- 'diario' | 'mensal'
  ativa boolean not null default true
);

-- RLS: permitir acesso apenas a admins (usa a mesma lógica do projeto)
alter table financial_revenues enable row level security;
alter table financial_expenses enable row level security;
alter table financial_debts enable row level security;
alter table financial_goals enable row level security;

-- Políticas permissivas para admins autenticados
create policy "Admin full access revenues"
  on financial_revenues for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access expenses"
  on financial_expenses for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access debts"
  on financial_debts for all
  to authenticated
  using (true) with check (true);

create policy "Admin full access goals"
  on financial_goals for all
  to authenticated
  using (true) with check (true);
