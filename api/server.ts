import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

const PORT = Number(process.env.PORT || 4000);
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const IS_PROD = process.env.NODE_ENV === 'production';

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();

app.use(cors({ origin: APP_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

type Role = 'admin' | 'editor';
type AuthUser = { email: string; name: string; role: Role };
type AuthedRequest = Request & { user?: AuthUser };

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url');
}

function signToken(user: AuthUser) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }));
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token?: string): AuthUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return { email: data.email, name: data.name, role: data.role };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies.nr1_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

function rowCompany(row: any) {
  return {
    id: row.id,
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    cidade: row.cidade,
    uf: row.uf,
    ramoAtividade: row.ramo_atividade,
    numeroColaboradores: row.numero_colaboradores,
    responsavelNome: row.responsavel_nome,
    responsavelEmail: row.responsavel_email,
    responsavelTelefone: row.responsavel_telefone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowCampaign(row: any) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    employeeFormMode: row.employee_form_mode,
    status: row.status,
    companyFormToken: row.company_form_token,
    employeeFormToken: row.employee_form_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowUser(row: any): AuthUser & { id: string; createdAt?: string } {
  return { id: row.email, email: row.email, name: row.name, role: row.role as Role, createdAt: row.created_at };
}

async function migrate() {
  const sql = readFileSync(new URL('./migrations/001_initial.sql', import.meta.url), 'utf8');
  await pool.query(sql);

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nr1.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const exists = await pool.query('select 1 from users where email = $1', [adminEmail]);
  if (!exists.rowCount) {
    await pool.query(
      'insert into users (email, name, role, password_hash) values ($1, $2, $3, $4)',
      [adminEmail, 'Admin Geral', 'admin', hashPassword(adminPassword)]
    );
  }
}

app.get('/health', asyncHandler(async (_req, res) => {
  await pool.query('select 1');
  res.json({ ok: true });
}));

app.post('/auth/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const result = await pool.query('select * from users where email = $1', [email]);
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const authUser = rowUser(user);
  const token = signToken(authUser);
  res.cookie('nr1_session', token, {
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax',
    secure: IS_PROD,
    maxAge: 1000 * 60 * 60 * 12,
  });
  res.json({ user: authUser });
}));

app.post('/auth/logout', (_req, res) => {
  res.clearCookie('nr1_session');
  res.json({ ok: true });
});

app.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

app.get('/users', requireAuth, asyncHandler(async (_req, res) => {
  const result = await pool.query('select email, name, role, created_at from users order by created_at desc');
  res.json({ users: result.rows.map(rowUser) });
}));

app.post('/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const password = req.body.password || randomBytes(9).toString('base64url');
  const email = String(req.body.email || '').toLowerCase().trim();
  const name = String(req.body.name || '').trim();
  const role = req.body.role === 'admin' ? 'admin' : 'editor';
  await pool.query(
    `insert into users (email, name, role, password_hash)
     values ($1, $2, $3, $4)
     on conflict (email) do update set name = excluded.name, role = excluded.role`,
    [email, name, role, hashPassword(password)]
  );
  res.status(201).json({ user: { id: email, email, name, role }, temporaryPassword: req.body.password ? undefined : password });
}));

app.delete('/users/:email', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await pool.query('delete from users where email = $1', [String(req.params.email).toLowerCase()]);
  res.json({ ok: true });
}));

app.get('/companies', requireAuth, asyncHandler(async (_req, res) => {
  const result = await pool.query('select * from companies order by created_at desc');
  res.json({ companies: result.rows.map(rowCompany) });
}));

app.post('/companies', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = randomUUID();
  const b = req.body;
  const result = await pool.query(
    `insert into companies (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [id, b.razaoSocial, b.nomeFantasia || null, b.cnpj, b.cidade, b.uf, b.ramoAtividade, String(b.numeroColaboradores || '0'), b.responsavelNome, b.responsavelEmail, b.responsavelTelefone || null, b.status || 'ativa']
  );
  res.status(201).json({ company: rowCompany(result.rows[0]) });
}));

app.patch('/companies/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const b = req.body;
  const result = await pool.query(
    `update companies set razao_social=$2, nome_fantasia=$3, cnpj=$4, cidade=$5, uf=$6, ramo_atividade=$7,
      numero_colaboradores=$8, responsavel_nome=$9, responsavel_email=$10, responsavel_telefone=$11, status=$12, updated_at=now()
     where id=$1 returning *`,
    [req.params.id, b.razaoSocial, b.nomeFantasia || null, b.cnpj, b.cidade, b.uf, b.ramoAtividade, String(b.numeroColaboradores || '0'), b.responsavelNome, b.responsavelEmail, b.responsavelTelefone || null, b.status || 'ativa']
  );
  res.json({ company: rowCompany(result.rows[0]) });
}));

app.get('/campaigns', requireAuth, asyncHandler(async (_req, res) => {
  const result = await pool.query('select * from campaigns order by created_at desc');
  res.json({ campaigns: result.rows.map(rowCampaign) });
}));

app.post('/campaigns', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const b = req.body;
  const result = await pool.query(
    `insert into campaigns (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_form_token, employee_form_token)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
    [randomUUID(), b.companyId, b.name, b.description || null, b.startDate || null, b.endDate || null, b.employeeFormMode || 'completo', b.status || 'ativa', b.companyFormToken, b.employeeFormToken]
  );
  res.status(201).json({ campaign: rowCampaign(result.rows[0]) });
}));

app.delete('/campaigns/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await pool.query('delete from campaigns where id = $1', [req.params.id]);
  res.json({ ok: true });
}));

app.get('/dashboard/summary', requireAuth, asyncHandler(async (_req, res) => {
  const [companies, activeCampaigns, emp, comp, last] = await Promise.all([
    pool.query('select count(*)::int count from companies'),
    pool.query("select count(*)::int count from campaigns where status='ativa'"),
    pool.query('select count(*)::int count from employee_responses'),
    pool.query('select count(*)::int count from company_responses'),
    pool.query('select answers from employee_responses order by submitted_at desc limit 20'),
  ]);
  res.json({
    totalCompanies: companies.rows[0].count,
    totalActiveCampaigns: activeCampaigns.rows[0].count,
    totalResponses: emp.rows[0].count + comp.rows[0].count,
    lastEmployeeResponses: last.rows,
  });
}));

app.get('/reports', requireAuth, asyncHandler(async (_req, res) => {
  const result = await pool.query(`
    select c.*, co.razao_social as company_name,
      (select count(*)::int from employee_responses er where er.campaign_id = c.id) as employee_responses_count,
      exists(select 1 from company_responses cr where cr.campaign_id = c.id) as company_response_submitted
    from campaigns c
    left join companies co on co.id = c.company_id
    order by c.created_at desc
  `);
  res.json({ reports: result.rows.map((r) => ({ ...rowCampaign(r), companyName: r.company_name || 'Empresa não encontrada', employeeResponsesCount: r.employee_responses_count, companyResponseSubmitted: r.company_response_submitted })) });
}));

app.get('/results/:campaignId', requireAuth, asyncHandler(async (req, res) => {
  const campaign = await pool.query('select * from campaigns where id=$1', [req.params.campaignId]);
  const responses = await pool.query('select * from employee_responses where campaign_id=$1 order by submitted_at desc', [req.params.campaignId]);
  res.json({
    campaign: campaign.rows[0] ? rowCampaign(campaign.rows[0]) : null,
    responses: responses.rows.map((r) => ({ id: r.id, campaignId: r.campaign_id, companyId: r.company_id, sector: r.sector, roleType: r.role_type, tenure: r.tenure, workType: r.work_type, workSchedule: r.work_schedule, answers: r.answers, scores: r.scores, submittedAt: r.submitted_at })),
  });
}));

app.get('/reports/:campaignId', requireAuth, asyncHandler(async (req, res) => {
  const campaign = await pool.query('select * from campaigns where id=$1', [req.params.campaignId]);
  const company = campaign.rows[0] ? await pool.query('select * from companies where id=$1', [campaign.rows[0].company_id]) : { rows: [] };
  const responses = await pool.query('select * from employee_responses where campaign_id=$1', [req.params.campaignId]);
  res.json({ campaign: campaign.rows[0] ? rowCampaign(campaign.rows[0]) : null, company: company.rows[0] ? rowCompany(company.rows[0]) : null, responses: responses.rows });
}));

app.get('/public/company-form/:token', asyncHandler(async (req, res) => {
  const result = await pool.query("select * from campaigns where company_form_token=$1 and status='ativa'", [req.params.token]);
  const campaign = result.rows[0];
  if (!campaign) return res.status(404).json({ error: 'not_found' });
  const company = await pool.query('select * from companies where id=$1', [campaign.company_id]);
  res.json({ campaign: rowCampaign(campaign), company: company.rows[0] ? rowCompany(company.rows[0]) : null });
}));

app.post('/public/company-responses', asyncHandler(async (req, res) => {
  const b = req.body;
  const active = await pool.query("select id from campaigns where id=$1 and status='ativa'", [b.campaignId]);
  if (!active.rowCount) return res.status(403).json({ error: 'campaign_inactive' });
  const result = await pool.query(
    'insert into company_responses (id, campaign_id, company_id, answers) values ($1,$2,$3,$4) returning id',
    [randomUUID(), b.campaignId, b.companyId, JSON.stringify(b.answers || {})]
  );
  res.status(201).json({ id: result.rows[0].id });
}));

app.get('/public/employee-form/:token', asyncHandler(async (req, res) => {
  const result = await pool.query("select * from campaigns where employee_form_token=$1 and status='ativa'", [req.params.token]);
  const campaign = result.rows[0];
  if (!campaign) return res.status(404).json({ error: 'not_found' });
  const company = await pool.query('select * from companies where id=$1', [campaign.company_id]);
  res.json({ campaign: rowCampaign(campaign), company: company.rows[0] ? rowCompany(company.rows[0]) : null });
}));

app.post('/public/employee-responses', asyncHandler(async (req, res) => {
  const b = req.body;
  const active = await pool.query("select id from campaigns where id=$1 and status='ativa'", [b.campaignId]);
  if (!active.rowCount) return res.status(403).json({ error: 'campaign_inactive' });
  const result = await pool.query(
    `insert into employee_responses (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, answers, scores)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [randomUUID(), b.campaignId, b.companyId, b.sector, b.roleType, b.tenure, b.workType, b.workSchedule, JSON.stringify(b.answers || {}), JSON.stringify(b.scores || {})]
  );
  res.status(201).json({ id: result.rows[0].id });
}));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

migrate().then(() => {
  app.listen(PORT, () => console.log(`NR1 API listening on ${PORT}`));
}).catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
