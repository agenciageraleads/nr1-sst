create table if not exists users (
  email text primary key,
  name text not null,
  role text not null check (role in ('admin', 'editor')),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id text primary key,
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  cidade text not null,
  uf text not null,
  ramo_atividade text not null,
  numero_colaboradores text not null,
  responsavel_nome text not null,
  responsavel_email text not null,
  responsavel_telefone text,
  status text not null check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists campaigns (
  id text primary key,
  company_id text not null references companies(id) on delete restrict,
  name text not null,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  employee_form_mode text not null default 'completo',
  status text not null check (status in ('rascunho', 'ativa', 'encerrada')),
  company_form_token text not null unique,
  employee_form_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists company_responses (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  company_id text not null references companies(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create table if not exists employee_responses (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  company_id text not null references companies(id) on delete cascade,
  sector text,
  role_type text,
  tenure text,
  work_type text,
  work_schedule text,
  answers jsonb not null,
  scores jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);

create index if not exists companies_status_idx on companies(status);
create index if not exists companies_cnpj_idx on companies(cnpj);
create index if not exists campaigns_status_idx on campaigns(status);
create index if not exists campaigns_company_id_idx on campaigns(company_id);
create index if not exists campaigns_company_form_token_idx on campaigns(company_form_token);
create index if not exists campaigns_employee_form_token_idx on campaigns(employee_form_token);
create index if not exists company_responses_campaign_id_idx on company_responses(campaign_id);
create index if not exists employee_responses_campaign_id_idx on employee_responses(campaign_id);
