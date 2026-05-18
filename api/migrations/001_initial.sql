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

create table if not exists questionnaires (
  id text primary key,
  slug text unique,
  name text not null,
  description text,
  form_type text not null check (form_type in ('company', 'employee')),
  company_id text references companies(id) on delete cascade,
  parent_id text references questionnaires(id) on delete set null,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  version integer not null default 1 check (version >= 1),
  created_by text references users(email) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists questionnaire_questions (
  id text primary key,
  questionnaire_id text not null references questionnaires(id) on delete cascade,
  question_key text not null,
  text text not null,
  description text,
  category text not null,
  question_type text not null check (question_type in ('scale', 'frequency', 'text', 'textarea', 'select', 'single_choice', 'number', 'email', 'checkbox')),
  required boolean not null default false,
  is_negative boolean not null default false,
  weight numeric not null default 1,
  position integer not null default 0,
  options jsonb not null default '[]',
  scoring jsonb not null default '{}',
  config jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (questionnaire_id, question_key)
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
  company_questionnaire_id text references questionnaires(id) on delete set null,
  employee_questionnaire_id text references questionnaires(id) on delete set null,
  company_form_token text not null unique,
  employee_form_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists company_responses (
  id text primary key,
  campaign_id text not null references campaigns(id) on delete cascade,
  company_id text not null references companies(id) on delete cascade,
  questionnaire_id text references questionnaires(id) on delete set null,
  questionnaire_version integer not null default 1,
  answers jsonb not null,
  scores jsonb not null default '{}',
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
  questionnaire_id text references questionnaires(id) on delete set null,
  questionnaire_version integer not null default 1,
  answers jsonb not null,
  scores jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);

create table if not exists public_diagnostics (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  campaign_id text not null references campaigns(id) on delete cascade,
  public_token text not null unique,
  responsible_name text not null,
  responsible_email text not null,
  responsible_phone text,
  status text not null default 'collecting' check (status in ('collecting', 'paid', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists payment_orders (
  id text primary key,
  public_diagnostic_id text not null references public_diagnostics(id) on delete cascade,
  campaign_id text not null references campaigns(id) on delete cascade,
  provider text not null default 'mercadopago' check (provider in ('mercadopago')),
  status text not null default 'created' check (status in ('created', 'pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'expired')),
  amount_cents integer not null,
  currency text not null default 'BRL',
  preference_id text,
  checkout_url text,
  external_reference text not null unique,
  provider_payment_id text,
  provider_status text,
  provider_status_detail text,
  payer_email text,
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists report_settings (
  id boolean primary key default true check (id),
  public_sales_enabled boolean not null default true,
  report_price_cents integer not null default 49700 check (report_price_cents > 0),
  max_installments integer not null default 12 check (max_installments between 1 and 12),
  min_employee_responses integer not null default 5 check (min_employee_responses >= 5),
  updated_at timestamptz not null default now()
);

create table if not exists report_download_audit (
  id text primary key,
  public_diagnostic_id text not null references public_diagnostics(id) on delete cascade,
  payment_order_id text not null references payment_orders(id) on delete restrict,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists llm_generation_logs (
  id text primary key,
  campaign_id text references campaigns(id) on delete cascade,
  public_diagnostic_id text references public_diagnostics(id) on delete set null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  status text not null,
  validation jsonb not null default '{}',
  masked_payload jsonb not null default '{}',
  cost_cents integer,
  provider_request_id text,
  created_at timestamptz not null default now()
);

insert into report_settings (id, public_sales_enabled, report_price_cents, max_installments, min_employee_responses)
values (true, true, 49700, 12, 5)
on conflict (id) do nothing;

update report_settings
set min_employee_responses = 5
where min_employee_responses < 5;

alter table campaigns add column if not exists company_questionnaire_id text references questionnaires(id) on delete set null;
alter table campaigns add column if not exists employee_questionnaire_id text references questionnaires(id) on delete set null;
alter table company_responses add column if not exists questionnaire_id text references questionnaires(id) on delete set null;
alter table company_responses add column if not exists questionnaire_version integer not null default 1;
alter table company_responses add column if not exists scores jsonb not null default '{}';
alter table employee_responses add column if not exists questionnaire_id text references questionnaires(id) on delete set null;
alter table employee_responses add column if not exists questionnaire_version integer not null default 1;

create index if not exists companies_status_idx on companies(status);
create index if not exists companies_cnpj_idx on companies(cnpj);
create index if not exists questionnaires_form_type_idx on questionnaires(form_type);
create index if not exists questionnaires_company_id_idx on questionnaires(company_id);
create index if not exists questionnaires_parent_id_idx on questionnaires(parent_id);
create index if not exists questionnaire_questions_questionnaire_id_idx on questionnaire_questions(questionnaire_id);
create index if not exists questionnaire_questions_active_idx on questionnaire_questions(questionnaire_id, active, position);
create index if not exists campaigns_status_idx on campaigns(status);
create index if not exists campaigns_company_id_idx on campaigns(company_id);
create index if not exists campaigns_company_questionnaire_id_idx on campaigns(company_questionnaire_id);
create index if not exists campaigns_employee_questionnaire_id_idx on campaigns(employee_questionnaire_id);
create index if not exists campaigns_company_form_token_idx on campaigns(company_form_token);
create index if not exists campaigns_employee_form_token_idx on campaigns(employee_form_token);
create index if not exists company_responses_campaign_id_idx on company_responses(campaign_id);
create index if not exists company_responses_questionnaire_id_idx on company_responses(questionnaire_id);
create index if not exists employee_responses_campaign_id_idx on employee_responses(campaign_id);
create index if not exists employee_responses_questionnaire_id_idx on employee_responses(questionnaire_id);
create index if not exists public_diagnostics_public_token_idx on public_diagnostics(public_token);
create index if not exists public_diagnostics_campaign_id_idx on public_diagnostics(campaign_id);
create index if not exists payment_orders_public_diagnostic_id_idx on payment_orders(public_diagnostic_id);
create index if not exists payment_orders_status_idx on payment_orders(status);
create index if not exists payment_orders_provider_payment_id_idx on payment_orders(provider_payment_id);
create index if not exists report_download_audit_public_diagnostic_id_idx on report_download_audit(public_diagnostic_id);
