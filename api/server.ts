import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import PDFDocument from 'pdfkit';
import {
  DEFAULT_EMPLOYEE_QUESTIONS,
  DEFAULT_QUESTIONNAIRES,
  type QuestionnaireFormType,
  type QuestionnaireOption,
  type QuestionnaireQuestionSeed,
  type QuestionnaireQuestionType,
} from '../shared/questionnaires.ts';
import { buildRiskTechnicalFindings, normalizeRiskKey } from '../shared/riskInterpretations.ts';
import { buildRiskRecommendations } from '../shared/riskRecommendations.ts';

const PORT = Number(process.env.PORT || 4000);
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || process.env.API_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const MERCADO_PAGO_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
const IS_PROD = process.env.NODE_ENV === 'production';

function envFlag(value: unknown, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on', 'sim'].includes(String(value).trim().toLowerCase());
}

const REPORT_LLM_CONFIG = {
  enabled: envFlag(process.env.REPORT_LLM_ENABLED, false),
  provider: process.env.REPORT_LLM_PROVIDER || 'disabled',
  model: process.env.REPORT_LLM_MODEL || 'not-configured',
  promptVersion: process.env.REPORT_LLM_PROMPT_VERSION || 'nr1-report-llm-v1',
  requireHumanReview: envFlag(process.env.REPORT_LLM_REQUIRE_REVIEW, true),
};

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();

app.use(cors({ origin: APP_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

type Role = 'admin' | 'editor';
type AuthUser = { email: string; name: string; role: Role };
type AuthedRequest = Request & { user?: AuthUser };
type Queryable = { query: (text: string, params?: any[]) => Promise<any> };
type ScorableQuestion = {
  id?: string;
  questionnaireId?: string;
  questionKey: string;
  text: string;
  description?: string | null;
  category: string;
  type: QuestionnaireQuestionType;
  required?: boolean;
  isNegative?: boolean;
  weight?: number;
  position?: number;
  options?: QuestionnaireOption[];
  scoring?: Record<string, unknown>;
  config?: Record<string, unknown>;
  active?: boolean;
};

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
    companyQuestionnaireId: row.company_questionnaire_id,
    employeeQuestionnaireId: row.employee_questionnaire_id,
    companyQuestionnaireName: row.company_questionnaire_name || null,
    employeeQuestionnaireName: row.employee_questionnaire_name || null,
    companyFormToken: row.company_form_token,
    employeeFormToken: row.employee_form_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowUser(row: any): AuthUser & { id: string; createdAt?: string } {
  return { id: row.email, email: row.email, name: row.name, role: row.role as Role, createdAt: row.created_at };
}

function rowReportSettings(row: any) {
  return {
    publicSalesEnabled: row.public_sales_enabled,
    reportPriceCents: row.report_price_cents,
    maxInstallments: row.max_installments,
    minEmployeeResponses: Math.max(5, Number(row.min_employee_responses || 5)),
    updatedAt: row.updated_at,
  };
}

function rowPaymentOrder(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    publicDiagnosticId: row.public_diagnostic_id,
    campaignId: row.campaign_id,
    provider: row.provider,
    status: row.status,
    amountCents: row.amount_cents,
    currency: row.currency,
    preferenceId: row.preference_id,
    checkoutUrl: row.checkout_url,
    providerPaymentId: row.provider_payment_id,
    providerStatus: row.provider_status,
    providerStatusDetail: row.provider_status_detail,
    payerEmail: row.payer_email,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowQuestionnaire(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    formType: row.form_type as QuestionnaireFormType,
    companyId: row.company_id,
    companyName: row.company_name || null,
    parentId: row.parent_id,
    parentName: row.parent_name || null,
    status: row.status,
    version: row.version,
    createdBy: row.created_by,
    questionCount: Number(row.question_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowQuestionnaireQuestion(row: any) {
  return {
    id: row.id,
    questionnaireId: row.questionnaire_id,
    questionKey: row.question_key,
    text: row.text,
    description: row.description,
    category: row.category,
    type: row.question_type as QuestionnaireQuestionType,
    required: row.required,
    isNegative: row.is_negative,
    weight: Number(row.weight || 1),
    position: Number(row.position || 0),
    options: normalizeJson(row.options) as QuestionnaireOption[],
    scoring: normalizeJson(row.scoring),
    config: normalizeJson(row.config),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generatePublicToken(prefix = 'nr1') {
  return `${prefix}_${randomBytes(18).toString('base64url')}`;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : String(value || '');
}

function appUrl(path = '') {
  return `${APP_URL.replace(/\/$/, '')}${path}`;
}

function apiUrl(path = '') {
  return `${API_PUBLIC_URL.replace(/\/$/, '')}${path}`;
}

function toDateString(value: any) {
  if (!value) return 'Não informado';
  return new Date(value).toLocaleDateString('pt-BR');
}

function normalizeJson(value: any) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function normalizeArray(value: any) {
  const parsed = normalizeJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function isValidFormType(value: any): value is QuestionnaireFormType {
  return value === 'company' || value === 'employee';
}

function isValidQuestionType(value: any): value is QuestionnaireQuestionType {
  return ['scale', 'frequency', 'text', 'textarea', 'select', 'single_choice', 'number', 'email', 'checkbox'].includes(value);
}

function toQuestionKey(value: any, fallback: string) {
  const normalized = String(value || fallback)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return normalized || fallback;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function optionValueMatches(optionValue: any, answer: any) {
  return String(optionValue) === String(answer);
}

function scoreQuestion(question: ScorableQuestion, answer: any) {
  if (answer === undefined || answer === null || answer === '') return null;
  const numeric = Number(answer);

  if (question.type === 'scale' || question.type === 'frequency') {
    if (!Number.isFinite(numeric) || numeric === 6) return null;
    if (numeric < 1 || numeric > 5) return null;
    const adjusted = question.isNegative ? 6 - numeric : numeric;
    return clampScore((adjusted - 1) * 25);
  }

  if (question.type === 'single_choice' || question.type === 'select') {
    const option = normalizeArray(question.options).find((item: any) => optionValueMatches(item.value ?? item.label, answer));
    const optionScore = Number(option?.score);
    return Number.isFinite(optionScore) ? clampScore(optionScore) : null;
  }

  if (question.type === 'number') {
    if (!Number.isFinite(numeric)) return null;
    const scoring = normalizeJson(question.scoring);
    const min = Number(scoring.min ?? 0);
    const max = Number(scoring.max ?? 100);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;
    const normalized = ((numeric - min) / (max - min)) * 100;
    return clampScore(question.isNegative ? 100 - normalized : normalized);
  }

  return null;
}

function isQuestionScorable(question: ScorableQuestion) {
  if (question.active === false) return false;
  if (question.type === 'scale' || question.type === 'frequency') return true;
  if (question.type === 'single_choice' || question.type === 'select') {
    return normalizeArray(question.options).some((option: any) => Number.isFinite(Number(option?.score)));
  }
  if (question.type === 'number') {
    const scoring = normalizeJson(question.scoring);
    const min = Number(scoring.min ?? 0);
    const max = Number(scoring.max ?? 100);
    return Number.isFinite(min) && Number.isFinite(max) && max !== min;
  }
  return false;
}

function calculateScoresFromQuestions(questions: ScorableQuestion[], answers: Record<string, any>) {
  const categories: Record<string, { total: number; weight: number }> = {};

  questions.forEach((question) => {
    if (!question.active) return;
    const score = scoreQuestion(question, answers?.[question.questionKey]);
    if (score === null) return;
    const weight = Number.isFinite(question.weight) && question.weight > 0 ? question.weight : 1;
    if (!categories[question.category]) categories[question.category] = { total: 0, weight: 0 };
    categories[question.category].total += score * weight;
    categories[question.category].weight += weight;
  });

  return Object.fromEntries(
    Object.entries(categories).map(([category, data]) => [category, clampScore(data.total / data.weight)])
  );
}

function validateRequiredAnswers(questions: ScorableQuestion[], answers: Record<string, any>) {
  return questions
    .filter((question) => question.active && question.required)
    .filter((question) => {
      const value = answers?.[question.questionKey];
      return value === undefined || value === null || value === '';
    })
    .map((question) => question.questionKey);
}

async function getQuestionnaireQuestions(questionnaireId: string, includeInactive = false, db: Queryable = pool) {
  const result = await db.query(
    `select * from questionnaire_questions
     where questionnaire_id = $1 and ($2::boolean or active = true)
     order by position asc, created_at asc`,
    [questionnaireId, includeInactive]
  );
  return result.rows.map(rowQuestionnaireQuestion);
}

async function getQuestionnaireDetail(questionnaireId: string, includeInactive = false, db: Queryable = pool) {
  const questionnaire = await db.query(
    `select q.*, co.razao_social as company_name, p.name as parent_name,
      (select count(*)::int from questionnaire_questions qq where qq.questionnaire_id = q.id and qq.active = true) as question_count
     from questionnaires q
     left join companies co on co.id = q.company_id
     left join questionnaires p on p.id = q.parent_id
     where q.id = $1`,
    [questionnaireId]
  );
  if (!questionnaire.rows[0]) return null;
  return {
    ...rowQuestionnaire(questionnaire.rows[0]),
    questions: await getQuestionnaireQuestions(questionnaireId, includeInactive, db),
  };
}

async function findDefaultQuestionnaire(formType: QuestionnaireFormType, db: Queryable = pool) {
  if (formType === 'employee') {
    const preferred = await db.query(
      `select * from questionnaires
       where form_type = $1 and company_id is null and status = 'active' and slug = 'default-employee-v2'
       limit 1`,
      [formType]
    );
    if (preferred.rows[0]) return preferred.rows[0];
  }

  const result = await db.query(
    `select * from questionnaires
     where form_type = $1 and company_id is null and status = 'active'
     order by created_at desc
     limit 1`,
    [formType]
  );
  return result.rows[0] || null;
}

async function resolveQuestionnaire(formType: QuestionnaireFormType, companyId: string, preferredId?: string | null, db: Queryable = pool) {
  if (preferredId) {
    const preferred = await db.query(
      `select * from questionnaires
       where id = $1 and form_type = $2 and status = 'active' and (company_id is null or company_id = $3)
       limit 1`,
      [preferredId, formType, companyId]
    );
    if (preferred.rows[0]) return preferred.rows[0];
  }

  const companySpecific = await db.query(
    `select * from questionnaires
     where form_type = $1 and company_id = $2 and status = 'active'
     order by updated_at desc nulls last, created_at desc
     limit 1`,
    [formType, companyId]
  );
  if (companySpecific.rows[0]) return companySpecific.rows[0];

  return findDefaultQuestionnaire(formType, db);
}

async function questionnaireForCampaign(campaign: any, formType: QuestionnaireFormType, db: Queryable = pool) {
  const id = formType === 'company' ? campaign.company_questionnaire_id : campaign.employee_questionnaire_id;
  return resolveQuestionnaire(formType, campaign.company_id, id, db);
}

async function calculateQuestionnaireScores(questionnaireId: string | null | undefined, answers: Record<string, any>, db: Queryable = pool) {
  if (!questionnaireId) return { scores: {}, missingRequired: [], version: 1 };
  const detail = await getQuestionnaireDetail(questionnaireId, false, db);
  if (!detail) return { scores: {}, missingRequired: [], version: 1 };
  const missingRequired = validateRequiredAnswers(detail.questions, answers);
  return {
    scores: calculateScoresFromQuestions(detail.questions, answers),
    missingRequired,
    version: detail.version,
  };
}

async function insertQuestion(questionnaireId: string, question: QuestionnaireQuestionSeed | any, db: Queryable = pool) {
  const fallback = `q_${randomUUID().slice(0, 8)}`;
  const questionKey = toQuestionKey(question.questionKey, fallback);
  const type = isValidQuestionType(question.type || question.questionType) ? question.type || question.questionType : 'text';
  const position = Number.isFinite(Number(question.position)) ? Number(question.position) : 0;
  const weight = Number.isFinite(Number(question.weight)) ? Number(question.weight) : 1;

  const result = await db.query(
    `insert into questionnaire_questions
      (id, questionnaire_id, question_key, text, description, category, question_type, required, is_negative, weight, position, options, scoring, config)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     returning *`,
    [
      randomUUID(),
      questionnaireId,
      questionKey,
      String(question.text || '').trim(),
      String(question.description || '').trim() || null,
      String(question.category || 'Geral').trim(),
      type,
      Boolean(question.required),
      Boolean(question.isNegative),
      weight,
      position,
      JSON.stringify(Array.isArray(question.options) ? question.options : []),
      JSON.stringify(question.scoring || {}),
      JSON.stringify(question.config || {}),
    ]
  );
  return rowQuestionnaireQuestion(result.rows[0]);
}

async function touchQuestionnaireVersion(questionnaireId: string, db: Queryable = pool) {
  await db.query('update questionnaires set version = version + 1, updated_at = now() where id = $1', [questionnaireId]);
}

async function getReportSettings() {
  const result = await pool.query('select * from report_settings where id = true');
  if (result.rows[0]) return rowReportSettings(result.rows[0]);
  const created = await pool.query(
    `insert into report_settings (id, public_sales_enabled, report_price_cents, max_installments, min_employee_responses)
     values (true, true, 49700, 12, 5)
     on conflict (id) do update set updated_at = report_settings.updated_at
     returning *`
  );
  return rowReportSettings(created.rows[0]);
}

async function seedDefaultQuestionnaires(createdBy: string) {
  for (const seed of DEFAULT_QUESTIONNAIRES) {
    const existing = await pool.query('select * from questionnaires where slug = $1 limit 1', [seed.slug]);
    let questionnaireId = existing.rows[0]?.id;

    if (!questionnaireId) {
      questionnaireId = randomUUID();
      await pool.query(
        `insert into questionnaires (id, slug, name, description, form_type, status, created_by)
         values ($1,$2,$3,$4,$5,'active',$6)`,
        [questionnaireId, seed.slug, seed.name, seed.description, seed.formType, createdBy]
      );
    }

    const questions = await pool.query('select count(*)::int count from questionnaire_questions where questionnaire_id = $1', [questionnaireId]);
    if (questions.rows[0]?.count > 0) continue;

    for (const question of seed.questions) {
      await insertQuestion(questionnaireId, question);
    }
  }
}

function calculateCategoryAverages(responses: any[]) {
  const categories: Record<string, { total: number; count: number }> = {};
  responses.forEach((response) => {
    const scores = normalizeJson(response.scores);
    Object.entries(scores).forEach(([category, score]) => {
      const numericScore = Number(score);
      if (!Number.isFinite(numericScore)) return;
      if (!categories[category]) categories[category] = { total: 0, count: 0 };
      categories[category].total += numericScore;
      categories[category].count += 1;
    });
  });

  return Object.entries(categories)
    .map(([name, data]) => {
      const score = Math.round(data.total / data.count);
      return { name, score, risk: 100 - score };
    })
    .sort((a, b) => b.risk - a.risk);
}

function defaultEmployeeEvidenceQuestions(): ScorableQuestion[] {
  return DEFAULT_EMPLOYEE_QUESTIONS.map((question) => ({
    questionKey: question.questionKey,
    text: question.text,
    description: question.description || null,
    category: question.category,
    type: question.type,
    required: question.required,
    isNegative: question.isNegative,
    weight: question.weight,
    position: question.position,
    options: question.options,
    scoring: question.scoring,
    config: question.config,
    active: true,
  }));
}

async function getEmployeeEvidenceQuestions(campaign: any, responses: any[]) {
  const questionnaireIds = Array.from(
    new Set(
      [
        campaign?.employee_questionnaire_id,
        ...responses.map((response) => response.questionnaire_id),
      ].filter(Boolean)
    )
  );

  const questionsByIdentity = new Map<string, ScorableQuestion>();
  for (const questionnaireId of questionnaireIds) {
    const questions = await getQuestionnaireQuestions(String(questionnaireId), false);
    questions.forEach((question) => {
      const key = `${question.questionnaireId || questionnaireId}:${question.questionKey}`;
      if (!questionsByIdentity.has(key)) {
        questionsByIdentity.set(key, question);
      }
    });
  }

  const questions = questionsByIdentity.size ? Array.from(questionsByIdentity.values()) : defaultEmployeeEvidenceQuestions();
  return questions
    .filter(isQuestionScorable)
    .sort((a, b) => (Number(a.position || 0) - Number(b.position || 0)) || a.questionKey.localeCompare(b.questionKey));
}

function hasProvidedAnswer(value: any) {
  return value !== undefined && value !== null && value !== '';
}

function calculateEmployeeEvidence(questions: ScorableQuestion[], responses: any[]) {
  const categoryOrder = new Map<string, number>();
  const questionEvidence = questions.map((question, index) => {
    if (!categoryOrder.has(question.category)) categoryOrder.set(question.category, index);

    const answerDistribution: Record<string, number> = {};
    let answeredCount = 0;
    let validResponseCount = 0;
    let skippedCount = 0;
    let invalidAnswerCount = 0;
    let rawAnswerTotal = 0;
    let rawAnswerCount = 0;
    let scoreTotal = 0;

    responses.forEach((response) => {
      if (question.questionnaireId && response.questionnaire_id && response.questionnaire_id !== question.questionnaireId) return;
      const answers = normalizeJson(response.answers);
      const answer = answers?.[question.questionKey];
      if (!hasProvidedAnswer(answer)) return;

      answeredCount += 1;
      const answerKey = String(answer);
      answerDistribution[answerKey] = (answerDistribution[answerKey] || 0) + 1;
      const numericAnswer = Number(answer);
      if (Number.isFinite(numericAnswer) && Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= 5) {
        rawAnswerTotal += numericAnswer;
        rawAnswerCount += 1;
      } else if ((question.type === 'scale' || question.type === 'frequency') && numericAnswer === 6) {
        skippedCount += 1;
      }

      const score = scoreQuestion(question, answer);
      if (score === null) {
        if (numericAnswer !== 6) invalidAnswerCount += 1;
        return;
      }

      validResponseCount += 1;
      scoreTotal += score;
    });

    const averageScore = validResponseCount ? clampScore(scoreTotal / validResponseCount) : null;
    const averageAnswer = rawAnswerCount ? Number((rawAnswerTotal / rawAnswerCount).toFixed(2)) : null;

    return {
      questionId: question.id || null,
      questionnaireId: question.questionnaireId || null,
      questionKey: question.questionKey,
      questionText: question.text,
      text: question.text,
      description: question.description || null,
      category: question.category,
      type: question.type,
      isNegative: Boolean(question.isNegative),
      weight: Number.isFinite(question.weight) && Number(question.weight) > 0 ? Number(question.weight) : 1,
      position: Number(question.position || index + 1),
      responseCount: responses.length,
      answeredCount,
      validResponseCount,
      skippedCount,
      invalidAnswerCount,
      answerDistribution,
      averageAnswer,
      averageScore,
      score: averageScore,
      risk: averageScore === null ? null : 100 - averageScore,
      scoring: normalizeJson(question.scoring),
    };
  });

  const categories = new Map<string, { scoreTotal: number; scoreWeight: number; validResponseCount: number; questionCount: number }>();
  questionEvidence.forEach((question) => {
    if (!categories.has(question.category)) categories.set(question.category, { scoreTotal: 0, scoreWeight: 0, validResponseCount: 0, questionCount: 0 });
    const category = categories.get(question.category)!;
    category.questionCount += 1;
    if (question.averageScore === null) return;
    const questionWeight = question.validResponseCount * question.weight;
    category.scoreTotal += question.averageScore * questionWeight;
    category.scoreWeight += questionWeight;
    category.validResponseCount += question.validResponseCount;
  });

  const categoryEvidence = Array.from(categories.entries())
    .map(([name, data]) => {
      const averageScore = data.scoreWeight ? clampScore(data.scoreTotal / data.scoreWeight) : null;
      const questions = questionEvidence
        .filter((question) => question.category === name)
        .sort((a, b) => {
          if (a.risk === null && b.risk === null) return a.position - b.position;
          if (a.risk === null) return 1;
          if (b.risk === null) return -1;
          return b.risk - a.risk;
        });
      return {
        name,
        category: name,
        questionCount: data.questionCount,
        validResponseCount: data.validResponseCount,
        averageScore,
        score: averageScore,
        risk: averageScore === null ? null : 100 - averageScore,
        drivers: questions.slice(0, 3),
        topDrivers: questions.slice(0, 3),
        questions,
      };
    })
    .sort((a, b) => (categoryOrder.get(a.name) ?? 0) - (categoryOrder.get(b.name) ?? 0));

  return {
    responseCount: responses.length,
    categories: categoryEvidence,
    questions: questionEvidence,
  };
}

function legacyEvidenceDriver(category: { name: string; score: number; risk: number }, responseCount: number) {
  const score = Math.round(Number(category.score || 0));
  const risk = Math.round(Number(category.risk || 0));

  return {
    questionId: null,
    questionnaireId: null,
    questionKey: `legacy_score_${normalizeRiskKey(category.name).replace(/\s+/g, '_') || 'categoria'}`,
    questionText: `Evidência agregada legada: média da categoria já coletada (${score}/100; risco ${risk}%).`,
    text: `Evidência agregada legada: média da categoria já coletada (${score}/100; risco ${risk}%).`,
    label: `Evidência agregada legada: score médio ${score}/100, risco ${risk}%, com ${responseCount} respostas preservadas.`,
    category: category.name,
    type: 'number',
    isNegative: false,
    weight: 1,
    position: 0,
    responseCount,
    answeredCount: responseCount,
    validResponseCount: responseCount,
    skippedCount: 0,
    invalidAnswerCount: 0,
    answerDistribution: {},
    averageAnswer: null,
    averageScore: score,
    score,
    risk,
    scoring: {},
    legacyAggregate: true,
  };
}

function buildLegacyEvidenceCategory(category: { name: string; score: number; risk: number }, responseCount: number) {
  const driver = legacyEvidenceDriver(category, responseCount);

  return {
    name: category.name,
    category: category.name,
    questionCount: 0,
    validResponseCount: responseCount,
    averageScore: category.score,
    score: category.score,
    risk: category.risk,
    drivers: [driver],
    topDrivers: [driver],
    questions: [],
    legacyAggregate: true,
  };
}

function ensureEvidenceCoverage(
  categoryAverages: Array<{ name: string; score: number; risk: number }>,
  evidence: { responseCount?: number; categories?: any[]; questions?: any[] },
  responseCount: number
) {
  const hasFiniteMetric = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const existingCategories = Array.isArray(evidence.categories) ? evidence.categories : [];
  const questions = Array.isArray(evidence.questions) ? evidence.questions : [];
  const categoriesByName = new Map(existingCategories.map((category) => [normalizeRiskKey(String(category.name || category.category || '')), category]));
  const completeCategories = categoryAverages.map((category) => {
    const key = normalizeRiskKey(category.name);
    const existing = categoriesByName.get(key);
    const drivers = existing?.drivers || existing?.topDrivers || existing?.questions || [];
    const hasRealEvidence = (
      Number(existing?.validResponseCount || 0) > 0 ||
      hasFiniteMetric(existing?.averageScore ?? existing?.score) ||
      (Array.isArray(drivers) && drivers.some((driver) => (
        Number(driver?.validResponseCount || driver?.responseCount || 0) > 0 &&
        hasFiniteMetric(driver?.averageScore ?? driver?.score ?? driver?.risk)
      )))
    );

    if (existing && Array.isArray(drivers) && drivers.length > 0 && hasRealEvidence) {
      return existing;
    }

    return buildLegacyEvidenceCategory(category, responseCount);
  });

  return {
    ...evidence,
    responseCount: evidence.responseCount ?? responseCount,
    categories: completeCategories,
    questions,
    hasLegacyAggregateEvidence: completeCategories.some((category) => category.legacyAggregate),
  };
}

function emptyEvidence(responseCount: number) {
  return { responseCount, categories: [], questions: [] };
}

function parseEmployeeCapacity(value: unknown) {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const count = Number(match[0]);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function privacySummary(employeeResponsesCount: number, minEmployeeResponses: number, employeeCapacity?: number | null) {
  const hasResponses = employeeResponsesCount > 0;

  if (!hasResponses) {
    return {
      minimumResponsesMet: false,
      minEmployeeResponses,
      employeeCapacity: employeeCapacity || null,
      smallCompanyMode: false,
      analysisAllowed: false,
      reportMode: 'insufficient_sample',
      message: 'Ainda não há respostas de colaboradores para calcular os riscos psicossociais da campanha.',
      nextAction: 'Coletar ao menos uma resposta de colaborador e gerar novamente o relatório.',
    };
  }

  return {
    minimumResponsesMet: true,
    minEmployeeResponses,
    employeeCapacity: employeeCapacity || null,
    smallCompanyMode: false,
    analysisAllowed: true,
    reportMode: 'collective_analysis',
    message: `Análise gerada com ${employeeResponsesCount} resposta(s) de colaboradores, usando os dados disponíveis na campanha.`,
    nextAction: 'Gerar análise agregada normalmente com as respostas disponíveis.',
  };
}

const SEGMENT_DEFINITIONS = [
  { key: 'sector', field: 'sector', label: 'Setor' },
  { key: 'roleType', field: 'role_type', label: 'Tipo de função' },
  { key: 'tenure', field: 'tenure', label: 'Tempo de empresa' },
  { key: 'workType', field: 'work_type', label: 'Tipo de trabalho' },
  { key: 'workSchedule', field: 'work_schedule', label: 'Jornada' },
];

function segmentLabel(value: unknown) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || 'Não informado';
}

function buildAnonymousSegmentations(responses: any[], minEmployeeResponses: number) {
  const totalResponses = responses.length;

  return SEGMENT_DEFINITIONS.map((definition) => {
    const groups = new Map<string, any[]>();
    responses.forEach((response) => {
      const value = segmentLabel(response[definition.field]);
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value)!.push(response);
    });

    const rawGroups = Array.from(groups.entries()).filter(([, rows]) => rows.length > 0);
    const visible = rawGroups
      .map(([value, rows]) => {
        const categories = calculateCategoryAverages(rows);
        const topRiskCategory = categories[0] || null;
        return {
          dimension: definition.key,
          dimensionLabel: definition.label,
          value,
          count: rows.length,
          share: totalResponses ? Math.round((rows.length / totalResponses) * 100) : 0,
          categories,
          topRiskCategory,
        };
      })
      .sort((a, b) => (b.topRiskCategory?.risk || 0) - (a.topRiskCategory?.risk || 0));

    return {
      key: definition.key,
      label: definition.label,
      totalGroups: rawGroups.length,
      visibleGroups: visible.length,
      hiddenGroups: 0,
      minEmployeeResponses,
      rule: 'Recortes exibidos com as respostas disponíveis na campanha.',
      segments: visible,
    };
  });
}

function buildInstitutionalComparison(categoryAverages: Array<{ name: string; score: number; risk: number }>, companyScores: any) {
  const scores = normalizeJson(companyScores);
  const companyScoresByCategory = new Map(Object.entries(scores).map(([category, score]) => [normalizeRiskKey(category), Number(score)]));

  return categoryAverages
    .map((category) => {
      const companyScore = companyScoresByCategory.get(normalizeRiskKey(category.name));
      if (!Number.isFinite(companyScore)) return null;
      const normalizedCompanyScore = clampScore(companyScore as number);
      const companyRisk = 100 - normalizedCompanyScore;
      const riskDifference = category.risk - companyRisk;
      const absDifference = Math.abs(riskDifference);
      return {
        category: category.name,
        employeeScore: category.score,
        employeeRisk: category.risk,
        companyScore: normalizedCompanyScore,
        companyRisk,
        riskDifference,
        absDifference,
        relevant: absDifference >= 15,
        direction: riskDifference >= 15
          ? 'percepcao_colaboradores_mais_critica'
          : riskDifference <= -15
            ? 'formulario_institucional_mais_critico'
            : 'alinhado',
        message: absDifference >= 15
          ? `Divergência de ${absDifference} pontos de risco entre percepção coletiva e formulário institucional.`
          : 'Percepção coletiva e formulário institucional estão próximos nesta categoria.',
      };
    })
    .filter(Boolean);
}

function finiteNumberOrNull(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function compactEvidenceLabels(categoryEvidence: any) {
  const drivers = categoryEvidence?.drivers || categoryEvidence?.topDrivers || categoryEvidence?.questions || [];
  if (!Array.isArray(drivers)) return [];
  return drivers
    .map((driver) => String(driver?.label || driver?.questionText || driver?.text || driver?.questionKey || '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildLlmSanitizedPayload({
  privacy,
  categories,
  evidence,
  technicalFindings,
  reportRecommendations,
  segmentations,
  institutionalComparison,
}: {
  privacy: ReturnType<typeof privacySummary>;
  categories: Array<{ name: string; score: number; risk: number }>;
  evidence: any;
  technicalFindings: any[];
  reportRecommendations: any[];
  segmentations: any[];
  institutionalComparison: any[];
}) {
  const evidenceByCategory = new Map(
    (Array.isArray(evidence?.categories) ? evidence.categories : []).map((category: any) => [
      normalizeRiskKey(String(category?.name || category?.category || '')),
      category,
    ])
  );

  return {
    privacy: {
      analysisAllowed: Boolean(privacy.analysisAllowed),
      reportMode: privacy.reportMode,
      minEmployeeResponses: privacy.minEmployeeResponses,
      employeeCapacity: privacy.employeeCapacity ?? null,
      smallCompanyMode: Boolean(privacy.smallCompanyMode),
    },
    categories: categories.map((category) => {
      const key = normalizeRiskKey(category.name);
      return {
        category: category.name,
        score: category.score,
        risk: category.risk,
        evidenceRefs: compactEvidenceLabels(evidenceByCategory.get(key)),
      };
    }),
    technicalFindings: technicalFindings.map((finding) => ({
      category: finding.category,
      canonicalCategory: finding.canonicalCategory,
      score: finiteNumberOrNull(finding.score),
      risk: finiteNumberOrNull(finding.risk),
      riskLevel: finding.riskLevel,
      riskLevelLabel: finding.riskLevelLabel,
      configured: Boolean(finding.configured),
      purpose: finding.purpose,
      observedFactors: Array.isArray(finding.observedFactors) ? finding.observedFactors.slice(0, 5) : [],
      riskMeaning: finding.riskMeaning,
      evidenceRefs: Array.isArray(finding.evidenceLabels) ? finding.evidenceLabels.slice(0, 3) : [],
      templateRef: normalizeRiskKey(String(finding.canonicalCategory || finding.category || '')),
      limitations: Array.isArray(finding.limitations) ? finding.limitations.slice(0, 3) : [],
    })),
    actionCandidates: reportRecommendations.map((recommendation) => ({
      id: recommendation.id,
      category: recommendation.category,
      priority: recommendation.priority,
      risk: finiteNumberOrNull(recommendation.risk),
      riskLevelLabel: recommendation.riskLevelLabel,
      evidenceRefs: Array.isArray(recommendation.evidenceLabels) ? recommendation.evidenceLabels.slice(0, 3) : [],
      rule: recommendation.rule,
      what: recommendation.what,
      why: recommendation.why,
      where: recommendation.where,
      who: recommendation.who,
      when: recommendation.when,
      how: recommendation.how,
      followUpIndicators: Array.isArray(recommendation.followUpIndicators) ? recommendation.followUpIndicators.slice(0, 4) : [],
    })),
    segmentations: segmentations
      .filter((item) => item?.visibleGroups > 0 || item?.hiddenGroups > 0)
      .map((item) => ({
        key: item.key,
        label: item.label,
        visibleGroups: Number(item.visibleGroups || 0),
        hiddenGroups: Number(item.hiddenGroups || 0),
        rule: item.rule,
        segments: Array.isArray(item.segments)
          ? item.segments.slice(0, 4).map((segment: any) => ({
              value: segment.value,
              count: segment.count,
              share: segment.share,
              topRiskCategory: segment.topRiskCategory
                ? {
                    name: segment.topRiskCategory.name,
                    risk: segment.topRiskCategory.risk,
                  }
                : null,
            }))
          : [],
      })),
    institutionalComparison: institutionalComparison
      .filter((item) => item?.relevant)
      .slice(0, 5)
      .map((item) => ({
        category: item.category,
        employeeRisk: item.employeeRisk,
        companyRisk: item.companyRisk,
        riskDifference: item.riskDifference,
        direction: item.direction,
        message: item.message,
      })),
  };
}

function validateLlmGuardrails(payload: ReturnType<typeof buildLlmSanitizedPayload>) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.privacy.analysisAllowed) {
    warnings.push('llm_not_allowed_by_privacy_gate');
  }

  payload.categories.forEach((category) => {
    if (!category.category || category.score == null || category.risk == null) {
      errors.push(`category_missing_score_or_risk:${category.category || 'unknown'}`);
    }
  });

  payload.technicalFindings.forEach((finding) => {
    if (!finding.category || finding.score == null || finding.risk == null || !finding.riskMeaning || !finding.templateRef) {
      errors.push(`technical_finding_missing_required_reference:${finding.category || 'unknown'}`);
    }
    if (!finding.evidenceRefs.length) {
      warnings.push(`technical_finding_without_evidence_refs:${finding.category || 'unknown'}`);
    }
  });

  payload.actionCandidates.forEach((recommendation) => {
    if (!recommendation.category || !recommendation.rule || !recommendation.evidenceRefs.length) {
      errors.push(`action_candidate_without_required_evidence:${recommendation.category || recommendation.id || 'unknown'}`);
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

function buildReportLlmAnalysis(args: Parameters<typeof buildLlmSanitizedPayload>[0]) {
  const sanitizedPayload = buildLlmSanitizedPayload(args);
  const validation = validateLlmGuardrails(sanitizedPayload);
  const status = !REPORT_LLM_CONFIG.enabled
    ? 'disabled'
    : !sanitizedPayload.privacy.analysisAllowed
      ? 'skipped_privacy_gate'
      : validation.passed
        ? 'ready_for_provider'
        : 'rejected';

  return {
    enabled: REPORT_LLM_CONFIG.enabled,
    status,
    provider: REPORT_LLM_CONFIG.enabled ? REPORT_LLM_CONFIG.provider : 'disabled',
    model: REPORT_LLM_CONFIG.enabled ? REPORT_LLM_CONFIG.model : 'not-configured',
    promptVersion: REPORT_LLM_CONFIG.promptVersion,
    requiresHumanReview: REPORT_LLM_CONFIG.requireHumanReview,
    generatedAt: new Date().toISOString(),
    source: 'guardrail_layer',
    inputSummary: {
      categories: sanitizedPayload.categories.length,
      technicalFindings: sanitizedPayload.technicalFindings.length,
      actionCandidates: sanitizedPayload.actionCandidates.length,
      segmentDimensions: sanitizedPayload.segmentations.length,
      visibleSegments: sanitizedPayload.segmentations.reduce((total, item) => total + item.visibleGroups, 0),
      relevantInstitutionalComparisons: sanitizedPayload.institutionalComparison.length,
      rawAnswersIncluded: false,
      rawScoresByPersonIncluded: false,
      personalIdentifiersIncluded: false,
    },
    schema: {
      name: 'ReportLlmDraftV1',
      requiredTopLevelFields: ['executiveSummary', 'categoryInterpretations', 'actionPlanNarrative', 'limitations'],
      requiredReferences: ['category', 'score', 'risk', 'evidenceRefs', 'templateRef'],
    },
    promptPreview: {
      system: 'Redigir síntese consultiva em português, sem alterar scores, sem diagnóstico clínico e usando somente evidências agregadas informadas.',
      userPayloadKeys: Object.keys(sanitizedPayload),
      outputFormat: 'JSON validado por schema ReportLlmDraftV1',
    },
    validation,
    audit: {
      logMode: 'masked_aggregate_payload',
      storesRawAnswers: false,
      storesPersonalIdentifiers: false,
      costCents: null,
      providerRequestId: null,
    },
    sanitizedPayload,
  };
}

async function getPublicStats(campaignId: string, minEmployeeResponses: number, options: { includeReportDetails?: boolean } = {}) {
  const [campaignResult, employeeCount, companyResponse, employeeRows, companyContext] = await Promise.all([
    options.includeReportDetails ? pool.query('select * from campaigns where id = $1', [campaignId]) : Promise.resolve({ rows: [] }),
    pool.query('select count(*)::int count from employee_responses where campaign_id = $1', [campaignId]),
    pool.query('select answers, scores, submitted_at from company_responses where campaign_id = $1 order by submitted_at desc limit 1', [campaignId]),
    options.includeReportDetails
      ? pool.query('select * from employee_responses where campaign_id = $1', [campaignId])
      : pool.query('select scores from employee_responses where campaign_id = $1', [campaignId]),
    pool.query(
      `select co.numero_colaboradores
       from campaigns c
       join companies co on co.id = c.company_id
       where c.id = $1`,
      [campaignId]
    ),
  ]);
  const employeeResponsesCount = employeeCount.rows[0]?.count || 0;
  const privacy = privacySummary(employeeResponsesCount, minEmployeeResponses, parseEmployeeCapacity(companyContext.rows[0]?.numero_colaboradores));
  const minimumResponsesMet = privacy.minimumResponsesMet;
  const scoredRows = companyResponse.rows[0]?.scores
    ? [...employeeRows.rows, { scores: companyResponse.rows[0].scores }]
    : employeeRows.rows;
  const categoryAverages = minimumResponsesMet ? calculateCategoryAverages(scoredRows) : [];
  const evidenceQuestions = minimumResponsesMet && options.includeReportDetails
    ? await getEmployeeEvidenceQuestions(campaignResult.rows[0], employeeRows.rows)
    : [];
  const rawEvidence = minimumResponsesMet && options.includeReportDetails
    ? calculateEmployeeEvidence(evidenceQuestions, employeeRows.rows)
    : emptyEvidence(employeeResponsesCount);
  const evidence = minimumResponsesMet && options.includeReportDetails
    ? ensureEvidenceCoverage(categoryAverages, rawEvidence, employeeResponsesCount)
    : rawEvidence;
  const technicalFindings = minimumResponsesMet && options.includeReportDetails ? buildRiskTechnicalFindings(categoryAverages, evidence.categories) : [];
  const reportRecommendations = minimumResponsesMet && options.includeReportDetails
    ? buildRiskRecommendations({
        categories: categoryAverages,
        evidence: evidence.categories,
        technicalFindings,
      })
    : [];
  const segmentations = minimumResponsesMet && options.includeReportDetails
    ? buildAnonymousSegmentations(employeeRows.rows, minEmployeeResponses)
    : [];
  const institutionalComparison = minimumResponsesMet
    ? buildInstitutionalComparison(calculateCategoryAverages(employeeRows.rows), companyResponse.rows[0]?.scores)
    : [];

  return {
    employeeResponsesCount,
    companyResponseSubmitted: Boolean(companyResponse.rowCount),
    companyResponseSubmittedAt: companyResponse.rows[0]?.submitted_at || null,
    companyScores: normalizeJson(companyResponse.rows[0]?.scores),
    minimumResponsesMet,
    minEmployeeResponses: privacy.minEmployeeResponses,
    privacy,
    categoryAverages,
    evidence,
    technicalFindings,
    reportRecommendations,
    segmentations,
    institutionalComparison,
  };
}

async function getPublicDiagnosticByToken(publicToken: string) {
  const diagnosticResult = await pool.query('select * from public_diagnostics where public_token = $1', [publicToken]);
  const diagnostic = diagnosticResult.rows[0];
  if (!diagnostic) return null;

  const [companyResult, campaignResult, settings, latestPayment] = await Promise.all([
    pool.query('select * from companies where id = $1', [diagnostic.company_id]),
    pool.query('select * from campaigns where id = $1', [diagnostic.campaign_id]),
    getReportSettings(),
    pool.query('select * from payment_orders where public_diagnostic_id = $1 order by created_at desc limit 1', [diagnostic.id]),
  ]);
  const company = companyResult.rows[0] ? rowCompany(companyResult.rows[0]) : null;
  const campaign = campaignResult.rows[0] ? rowCampaign(campaignResult.rows[0]) : null;
  if (!company || !campaign) return null;

  const stats = await getPublicStats(campaign.id, settings.minEmployeeResponses);
  const payment = rowPaymentOrder(latestPayment.rows[0]);
  const reportUnlocked = payment?.status === 'approved';

  return {
    id: diagnostic.id,
    token: diagnostic.public_token,
    responsibleName: diagnostic.responsible_name,
    responsibleEmail: diagnostic.responsible_email,
    responsiblePhone: diagnostic.responsible_phone,
    status: diagnostic.status,
    createdAt: diagnostic.created_at,
    updatedAt: diagnostic.updated_at,
    company,
    campaign,
    stats,
    payment,
    reportUnlocked,
    settings,
    links: {
      dashboard: appUrl(`/diagnostico/${diagnostic.public_token}`),
      companyForm: appUrl(`/formulario/empresa/${campaign.companyFormToken}`),
      employeeForm: appUrl(`/formulario/colaborador/${campaign.employeeFormToken}`),
      reportPdf: apiUrl(`/public/diagnostics/${diagnostic.public_token}/report.pdf`),
    },
  };
}

async function getApprovedPaymentOrder(publicDiagnosticId: string) {
  const result = await pool.query(
    `select * from payment_orders
     where public_diagnostic_id = $1 and status = 'approved'
     order by paid_at desc nulls last, updated_at desc nulls last, created_at desc
     limit 1`,
    [publicDiagnosticId]
  );
  return result.rows[0] || null;
}

function getMercadoPagoPaymentId(req: Request) {
  const body = req.body || {};
  const fromBody = body?.data?.id || body?.resource?.id;
  const fromQuery = req.query['data.id'] || req.query.id || req.query['data_id'];
  const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  return String(fromBody || value || '').trim();
}

function isAllowedMercadoPagoStatus(status: string) {
  return ['created', 'pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'expired'].includes(status);
}

function mapMercadoPagoStatus(status: any) {
  const normalized = String(status || 'pending');
  return isAllowedMercadoPagoStatus(normalized) ? normalized : 'pending';
}

function validateMercadoPagoSignature(req: Request, paymentId: string) {
  if (!MERCADO_PAGO_WEBHOOK_SECRET) return !IS_PROD;
  const signatureHeader = String(req.headers['x-signature'] || '');
  const requestId = String(req.headers['x-request-id'] || '');
  if (!signatureHeader || !requestId || !paymentId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=').map((item) => item.trim());
      return [key, value];
    })
  );
  const ts = parts.ts;
  const signature = parts.v1;
  if (!ts || !signature) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest('hex');
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function fetchMercadoPagoPayment(paymentId: string) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) throw new Error('mercado_pago_not_configured');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Mercado Pago HTTP ${response.status}`);
  }
  return payload;
}

async function applyMercadoPagoPayment(payment: any) {
  const externalReference = String(payment.external_reference || '').trim();
  if (!externalReference) return null;
  const status = mapMercadoPagoStatus(payment.status);
  const result = await pool.query(
    `update payment_orders
     set status = $2,
       provider_payment_id = $3,
       provider_status = $4,
       provider_status_detail = $5,
       payer_email = $6,
       paid_at = case when $2 = 'approved' then coalesce(paid_at, now()) else paid_at end,
       raw_payload = $7,
       updated_at = now()
     where external_reference = $1
     returning *`,
    [
      externalReference,
      status,
      String(payment.id || ''),
      payment.status || null,
      payment.status_detail || null,
      payment.payer?.email || null,
      JSON.stringify(payment),
    ]
  );
  const order = result.rows[0];
  if (order && status === 'approved') {
    await pool.query("update public_diagnostics set status = 'paid', updated_at = now() where id = $1", [order.public_diagnostic_id]);
  }
  return order || null;
}

async function createMercadoPagoPreference(payload: {
  orderId: string;
  publicToken: string;
  companyName: string;
  amountCents: number;
  maxInstallments: number;
}) {
  if (!MERCADO_PAGO_ACCESS_TOKEN) throw new Error('mercado_pago_not_configured');
  const body = {
    items: [
      {
        id: 'diagnostico-nr01-pdf',
        title: 'PDF tecnico Diagnostico NR-01',
        description: `Relatorio tecnico para ${payload.companyName}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: payload.amountCents / 100,
      },
    ],
    external_reference: payload.orderId,
    notification_url: apiUrl('/webhooks/mercadopago?source_news=webhooks'),
    back_urls: {
      success: appUrl(`/diagnostico/${payload.publicToken}/pagamento?status=success`),
      pending: appUrl(`/diagnostico/${payload.publicToken}/pagamento?status=pending`),
      failure: appUrl(`/diagnostico/${payload.publicToken}/pagamento?status=failure`),
    },
    auto_return: 'approved',
    payment_methods: {
      installments: payload.maxInstallments,
    },
    statement_descriptor: 'VENTURA NR1',
    metadata: {
      public_token: payload.publicToken,
      order_id: payload.orderId,
    },
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const preference = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(preference?.message || preference?.error || `Mercado Pago HTTP ${response.status}`);
  }
  return preference;
}

async function buildReportData(publicToken: string) {
  const payload = await getPublicDiagnosticByToken(publicToken);
  if (!payload) return null;
  const [companyResponse, stats] = await Promise.all([
    pool.query(
    'select answers, submitted_at from company_responses where campaign_id = $1 order by submitted_at desc limit 1',
    [payload.campaign.id]
    ),
    getPublicStats(payload.campaign.id, payload.settings.minEmployeeResponses, { includeReportDetails: true }),
  ]);
  return {
    ...payload,
    stats,
    companyAnswers: normalizeJson(companyResponse.rows[0]?.answers),
    companyResponseSubmittedAt: companyResponse.rows[0]?.submitted_at || null,
  };
}

async function generateDiagnosticPdf(data: NonNullable<Awaited<ReturnType<typeof buildReportData>>>) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Diagnostico NR-01 - ${data.company.razaoSocial}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageBottom = () => doc.page.height - doc.page.margins.bottom;
    const ensureSpace = (height: number) => {
      if (doc.y + height > pageBottom()) {
        doc.addPage();
        drawHeader();
      }
    };

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#16a34a').text('VENTURA SST', 48, 25);
      doc.font('Helvetica').fontSize(7).fillColor('#64748b').text('INVENTÁRIO DE RISCOS PSICOSSOCIAIS', 0, 25, { align: 'right', width: doc.page.width - 48 });
      doc.moveTo(48, 36).lineTo(doc.page.width - 48, 36).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.y = 48;
    };

    const sectionTitle = (title: string) => {
      ensureSpace(45);
      doc.moveDown(1.2);
      const y = doc.y;
      doc.rect(48, y, 4, 18).fill('#16a34a'); // Vertical professional VTC green bar
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(title.toUpperCase(), 58, y + 3);
      doc.y = y + 25;
    };

    const labelValue = (label: string, value: string) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(label.toUpperCase());
      doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(value || 'Não informado');
      doc.moveDown(0.6);
    };

    const technicalByCategory = new Map((data.stats.technicalFindings || []).map((finding: any) => [normalizeRiskKey(finding.category), finding]));
    const recommendationsByCategory = new Map((data.stats.reportRecommendations || []).map((recommendation: any) => [normalizeRiskKey(recommendation.category), recommendation]));
    const shortText = (value = '', max = 82) => {
      const text = String(value || '').replace(/\s+/g, ' ').replace(/\.$/, '').trim();
      return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
    };
    const sentenceCase = (value = '') => value ? `${value.charAt(0).toLocaleUpperCase('pt-BR')}${value.slice(1)}` : value;
    const monthLabels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const actionMonths = Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() + index);
      return { label: monthLabels[date.getMonth()], year: date.getFullYear() };
    });

    // ==========================================
    // C A P A   D O   R E L A T Ó R I O   (Pág 1)
    // ==========================================
    const logoPath = path.join(process.cwd(), 'public', 'logo horizontal.png');
    
    if (existsSync(logoPath)) {
      doc.image(logoPath, 48, 60, { width: 150 });
    } else {
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#16a34a').text('VENTURA');
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('TREINAMENTOS E CONSULTORIA');
    }

    // Title Block
    doc.y = 210;
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#0f172a').text('INVENTÁRIO DE RISCOS', 48);
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#16a34a').text('PSICOSSOCIAIS', 48);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(14).fillColor('#64748b').text('DIAGNÓSTICO PREVENTIVO NR-01', 48);

    // Elegant Metadata Box
    doc.y = 350;
    const boxWidth = doc.page.width - 96;
    const boxHeight = 180;
    doc.roundedRect(48, doc.y, boxWidth, boxHeight, 8).fillColor('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).fillAndStroke();
    
    let metaY = doc.y + 18;
    const drawMetaLine = (label: string, value: string) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#16a34a').text(label.toUpperCase(), 64, metaY);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(value || 'Não informado', 64, metaY + 12);
      metaY += 38;
    };
    drawMetaLine('Razão Social', data.company.razaoSocial);
    drawMetaLine('CNPJ / Ramo de Atividade', `${data.company.cnpj} - ${data.company.ramoAtividade}`);
    drawMetaLine('Responsável Técnico / Emissão', `${data.responsibleName} - ${new Date().toLocaleDateString('pt-BR')}`);

    // Footer on Cover Page
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#16a34a').text('DOCUMENTO COMPLEMENTAR AO PGR', 0, doc.page.height - 65, { align: 'center', width: doc.page.width });
    
    // Page Break to Page 2
    doc.addPage();
    drawHeader();

    // ==========================================
    // D O C U M E N T   C O N T E N T S (Pág 2+)
    // ==========================================
    sectionTitle('1. Identificação do Estabelecimento');
    labelValue('Razão social', data.company.razaoSocial);
    labelValue('CNPJ', data.company.cnpj);
    labelValue('Ramo de atividade', data.company.ramoAtividade);
    labelValue('Cidade/UF', `${data.company.cidade}/${data.company.uf}`);
    labelValue('Responsável pelo diagnóstico', `${data.responsibleName} - ${data.responsibleEmail}`);

    sectionTitle('2. Dados do Inventário');
    labelValue('Campanha', data.campaign.name);
    labelValue('Período de coleta', `${toDateString(data.campaign.startDate)} até ${toDateString(data.campaign.endDate)}`);
    labelValue('Participantes', `${data.stats.employeeResponsesCount} colaboradores`);
    labelValue('Formulário institucional', data.stats.companyResponseSubmitted ? 'Recebido' : 'Pendente');

    sectionTitle('3. Metodologia e Privacidade');
    doc.font('Helvetica').fontSize(10).fillColor('#334155').text(
      'Este diagnóstico consolida respostas institucionais e percepções coletivas dos colaboradores para apoiar a identificação, avaliação e mitigação de fatores psicossociais relacionados ao trabalho, preservando o anonimato individual conforme boas práticas de LGPD.',
      { align: 'justify', lineGap: 3 }
    );
    doc.moveDown(0.8);
    doc.text(
      'Os indicadores são calculados com as respostas disponíveis na campanha. O relatório não lista respostas individuais e apresenta recortes apenas como consolidação operacional dos dados coletados.',
      { align: 'justify', lineGap: 3 }
    );

    sectionTitle('4. Resultados Agregados');
    if (!data.stats.minimumResponsesMet) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#b45309').text(
        'Sem respostas de colaboradores.'
      );
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(
        data.stats.privacy?.message || 'Colete ao menos uma resposta de colaborador antes de interpretar riscos por categoria.'
      );
    } else {
      data.stats.categoryAverages.forEach((category) => {
        ensureSpace(64);
        const finding: any = technicalByCategory.get(normalizeRiskKey(category.name));
        const barX = doc.x;
        const barY = doc.y + 18;
        const barWidth = 320;
        const riskColor = category.risk > 60 ? '#dc2626' : category.risk > 40 ? '#d97706' : '#16a34a';
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(category.name, barX, doc.y);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(riskColor).text(`${category.risk}% de risco`, barX + 360, doc.y - 12, { width: 110, align: 'right' });
        
        // Progress track & fill
        doc.roundedRect(barX, barY, barWidth, 8, 4).fill('#e2e8f0');
        doc.roundedRect(barX, barY, Math.max(8, (barWidth * category.risk) / 100), 8, 4).fill(riskColor);
        doc.y = barY + 16;
        if (finding?.riskMeaning) {
          doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(finding.riskMeaning, { lineGap: 2 });
        }
        doc.y += 10;
      });
    }

    sectionTitle('5. Segmentação Anônima e Comparativo');
    if (!data.stats.minimumResponsesMet) {
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(
        'Segmentações e comparativos aparecem assim que houver resposta de colaborador para calcular os recortes.'
      );
    } else {
      const segmentations = (data.stats.segmentations || []).filter((item: any) => item.visibleGroups > 0 || item.hiddenGroups > 0);
      if (!segmentations.length) {
        doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Nenhum recorte disponível nas respostas da campanha.');
      } else {
        segmentations.forEach((segmentation: any) => {
          ensureSpace(48);
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(segmentation.label);
          (segmentation.segments || []).slice(0, 3).forEach((segment: any) => {
            const top = segment.topRiskCategory ? `${segment.topRiskCategory.name}: ${segment.topRiskCategory.risk}%` : 'sem risco calculado';
            doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(`  • ${segment.value} - ${segment.count} respostas (${segment.share}%) - maior risco: ${top}`);
          });
        });
      }

      const comparisons = (data.stats.institutionalComparison || []).filter((item: any) => item.relevant).slice(0, 4);
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Comparativo Institucional');
      if (!comparisons.length) {
        doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Sem divergência institucional relevante nas categorias calculadas.');
      } else {
        comparisons.forEach((item: any) => {
          doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(`  • ${item.category}: colaboradores ${item.employeeRisk}% x institucional ${item.companyRisk}%. ${item.message}`);
        });
      }
    }

    sectionTitle('6. Cronograma de Ações');
    const criticalItems = data.stats.categoryAverages.filter((category) => category.risk > 40);
    if (!data.stats.minimumResponsesMet) {
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(
        'O plano de ação será gerado quando houver ao menos uma resposta de colaborador na campanha.'
      );
    } else if (!criticalItems.length) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#15803d').text('Nível de risco controlado.');
      doc.font('Helvetica').fontSize(10).fillColor('#475569').text(
        'Recomenda-se manter boas práticas, monitorar indicadores periodicamente e registrar evidências de ações preventivas no PGR.'
      );
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#334155').text(
        'As datas de execução devem ser definidas em conjunto com a empresa após a apresentação dos resultados.',
        { align: 'justify', lineGap: 2 }
      );
      doc.moveDown(0.8);

      const drawActionHeader = () => {
        const x = doc.page.margins.left;
        const y = doc.y;
        const problemWidth = 118;
        const actionWidth = 128;
        const monthWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - problemWidth - actionWidth) / 12;
        doc.rect(x, y, problemWidth, 31).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.rect(x + problemWidth, y, actionWidth, 31).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text('Problema encontrado', x + 4, y + 10, { width: problemWidth - 8, align: 'center' });
        doc.text('Ação sugerida', x + problemWidth + 4, y + 10, { width: actionWidth - 8, align: 'center' });
        actionMonths.forEach((month, index) => {
          const cellX = x + problemWidth + actionWidth + index * monthWidth;
          doc.rect(cellX, y, monthWidth, 31).fillAndStroke('#f1f5f9', '#cbd5e1');
          doc.text(`${month.label}\n${month.year}`, cellX + 1, y + 7, { width: monthWidth - 2, align: 'center' });
        });
        doc.y = y + 31;
        return { problemWidth, actionWidth, monthWidth };
      };

      let widths = drawActionHeader();
      criticalItems.forEach((item) => {
        const recommendation: any = recommendationsByCategory.get(normalizeRiskKey(item.name));
        if (doc.y + 40 > pageBottom()) {
          doc.addPage();
          drawHeader();
          widths = drawActionHeader();
        }
        const x = doc.page.margins.left;
        const y = doc.y;
        const problem = `${item.name}: risco ${item.risk}%`;
        const action = sentenceCase(shortText(recommendation?.what || 'Definir ação preventiva para o fator identificado', 70));
        
        doc.rect(x, y, widths.problemWidth, 38).stroke('#cbd5e1');
        doc.rect(x + widths.problemWidth, y, widths.actionWidth, 38).stroke('#cbd5e1');
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(shortText(problem, 74), x + 4, y + 8, { width: widths.problemWidth - 8 });
        doc.font('Helvetica').fontSize(7).fillColor('#334155').text(action, x + widths.problemWidth + 4, y + 8, { width: widths.actionWidth - 8 });
        
        actionMonths.forEach((_, index) => {
          const cellX = x + widths.problemWidth + widths.actionWidth + index * widths.monthWidth;
          doc.rect(cellX, y, widths.monthWidth, 38).stroke('#cbd5e1');
        });
        doc.y = y + 38;
      });
    }

    sectionTitle('7. Assinaturas');
    doc.moveDown(2.5);
    const signatureY = doc.y;
    doc.moveTo(70, signatureY).lineTo(245, signatureY).strokeColor('#cbd5e1').stroke();
    doc.moveTo(340, signatureY).lineTo(515, signatureY).strokeColor('#cbd5e1').stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Consultoria Técnica - Ventura', 70, signatureY + 8, { width: 175, align: 'center' });
    doc.text('Representante da Empresa', 340, signatureY + 8, { width: 175, align: 'center' });

    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(
      'Documento técnico complementar ao PGR',
      48,
      doc.page.height - 45,
      { align: 'center', width: doc.page.width - 96 }
    );
    doc.end();
  });
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

  await seedDefaultQuestionnaires(adminEmail);
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

app.get('/report-settings', requireAuth, asyncHandler(async (_req, res) => {
  res.json({ settings: await getReportSettings() });
}));

app.patch('/report-settings', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const price = Math.round(Number(req.body.reportPriceCents));
  const installments = Math.round(Number(req.body.maxInstallments));
  const minResponses = Math.round(Number(req.body.minEmployeeResponses));
  const publicSalesEnabled = Boolean(req.body.publicSalesEnabled);

  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'invalid_price' });
  if (!Number.isFinite(installments) || installments < 1 || installments > 12) return res.status(400).json({ error: 'invalid_installments' });
  if (!Number.isFinite(minResponses) || minResponses < 5) return res.status(400).json({ error: 'invalid_min_responses', message: 'A quantidade interna de referência deve ser de pelo menos 5 respostas.' });

  const result = await pool.query(
    `update report_settings
     set public_sales_enabled = $1,
       report_price_cents = $2,
       max_installments = $3,
       min_employee_responses = $4,
       updated_at = now()
     where id = true
     returning *`,
    [publicSalesEnabled, price, installments, Math.max(5, minResponses)]
  );
  res.json({ settings: rowReportSettings(result.rows[0]) });
}));

app.get('/questionnaires', requireAuth, asyncHandler(async (req, res) => {
  const formType = String(req.query.formType || '');
  const companyId = String(req.query.companyId || '');
  const filters: string[] = [];
  const params: any[] = [];

  if (isValidFormType(formType)) {
    params.push(formType);
    filters.push(`q.form_type = $${params.length}`);
  }

  if (companyId) {
    params.push(companyId);
    filters.push(`(q.company_id = $${params.length} or q.company_id is null)`);
  }

  const result = await pool.query(
    `select q.*, co.razao_social as company_name, p.name as parent_name,
      count(qq.id)::int as question_count
     from questionnaires q
     left join companies co on co.id = q.company_id
     left join questionnaires p on p.id = q.parent_id
     left join questionnaire_questions qq on qq.questionnaire_id = q.id and qq.active = true
     ${filters.length ? `where ${filters.join(' and ')}` : ''}
     group by q.id, co.razao_social, p.name
     order by q.company_id nulls first, q.form_type asc, q.created_at desc`,
    params
  );
  res.json({ questionnaires: result.rows.map(rowQuestionnaire) });
}));

app.get('/questionnaires/:id', requireAuth, asyncHandler(async (req, res) => {
  const questionnaireId = firstParam(req.params.id);
  const questionnaire = await getQuestionnaireDetail(questionnaireId, true);
  if (!questionnaire) return res.status(404).json({ error: 'not_found' });
  res.json({ questionnaire });
}));

app.post('/questionnaires', requireAuth, asyncHandler(async (req: AuthedRequest, res) => {
  const b = req.body || {};
  if (!isValidFormType(b.formType)) return res.status(400).json({ error: 'invalid_form_type' });
  const name = String(b.name || '').trim();
  const description = String(b.description || '').trim();
  const companyId = String(b.companyId || '').trim() || null;
  const inheritFromId = String(b.inheritFromId || b.parentId || '').trim() || null;

  const client = await pool.connect();
  try {
    await client.query('begin');
    let parent: any = null;
    if (inheritFromId) {
      const parentResult = await client.query('select * from questionnaires where id = $1 and form_type = $2', [inheritFromId, b.formType]);
      parent = parentResult.rows[0] || null;
      if (!parent) {
        await client.query('rollback');
        return res.status(404).json({ error: 'parent_not_found' });
      }
    } else if (companyId) {
      parent = await findDefaultQuestionnaire(b.formType, client);
    }

    if (companyId) {
      const company = await client.query('select id, razao_social from companies where id = $1', [companyId]);
      if (!company.rowCount) {
        await client.query('rollback');
        return res.status(404).json({ error: 'company_not_found' });
      }
    }

    const questionnaireId = randomUUID();
    const result = await client.query(
      `insert into questionnaires (id, name, description, form_type, company_id, parent_id, status, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning *`,
      [
        questionnaireId,
        name || (parent ? `${parent.name} customizado` : 'Novo formulário'),
        description || parent?.description || null,
        b.formType,
        companyId,
        parent?.id || null,
        b.status === 'draft' ? 'draft' : 'active',
        req.user?.email || null,
      ]
    );

    if (parent) {
      const questions = await getQuestionnaireQuestions(parent.id, false, client);
      for (const question of questions) {
        await insertQuestion(questionnaireId, {
          questionKey: question.questionKey,
          text: question.text,
          description: question.description,
          category: question.category,
          type: question.type,
          required: question.required,
          isNegative: question.isNegative,
          weight: question.weight,
          position: question.position,
          options: question.options,
          scoring: question.scoring,
          config: question.config,
        }, client);
      }
    }

    await client.query('commit');
    const questionnaire = await getQuestionnaireDetail(result.rows[0].id, true);
    res.status(201).json({ questionnaire });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}));

app.patch('/questionnaires/:id', requireAuth, asyncHandler(async (req, res) => {
  const questionnaireId = firstParam(req.params.id);
  const b = req.body || {};
  const status = ['draft', 'active', 'archived'].includes(b.status) ? b.status : 'active';
  const result = await pool.query(
    `update questionnaires
     set name = $2,
       description = $3,
       status = $4,
       updated_at = now()
     where id = $1
     returning *`,
    [questionnaireId, String(b.name || '').trim(), String(b.description || '').trim() || null, status]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });
  res.json({ questionnaire: await getQuestionnaireDetail(questionnaireId, true) });
}));

app.post('/questionnaires/:id/questions', requireAuth, asyncHandler(async (req, res) => {
  const questionnaireId = firstParam(req.params.id);
  const exists = await pool.query('select id from questionnaires where id = $1', [questionnaireId]);
  if (!exists.rowCount) return res.status(404).json({ error: 'not_found' });
  const question = await insertQuestion(questionnaireId, req.body || {});
  await touchQuestionnaireVersion(questionnaireId);
  res.status(201).json({ question, questionnaire: await getQuestionnaireDetail(questionnaireId, true) });
}));

app.patch('/questionnaires/:id/questions/:questionId', requireAuth, asyncHandler(async (req, res) => {
  const questionnaireId = firstParam(req.params.id);
  const questionId = firstParam(req.params.questionId);
  const b = req.body || {};
  const current = await pool.query('select * from questionnaire_questions where id = $1 and questionnaire_id = $2', [questionId, questionnaireId]);
  if (!current.rows[0]) return res.status(404).json({ error: 'not_found' });
  const proposedType = b.type || b.questionType || current.rows[0].question_type;
  const questionType = isValidQuestionType(proposedType) ? proposedType : current.rows[0].question_type;
  const result = await pool.query(
    `update questionnaire_questions
     set question_key = $3,
       text = $4,
       description = $5,
       category = $6,
       question_type = $7,
       required = $8,
       is_negative = $9,
       weight = $10,
       position = $11,
       options = $12,
       scoring = $13,
       config = $14,
       active = $15,
       updated_at = now()
     where id = $1 and questionnaire_id = $2
     returning *`,
    [
      questionId,
      questionnaireId,
      toQuestionKey(b.questionKey ?? current.rows[0].question_key, current.rows[0].question_key),
      String(b.text ?? current.rows[0].text).trim(),
      String(b.description ?? current.rows[0].description ?? '').trim() || null,
      String((b.category ?? current.rows[0].category) || 'Geral').trim(),
      questionType,
      Boolean(b.required ?? current.rows[0].required),
      Boolean(b.isNegative ?? current.rows[0].is_negative),
      Number.isFinite(Number(b.weight ?? current.rows[0].weight)) ? Number(b.weight ?? current.rows[0].weight) : 1,
      Number.isFinite(Number(b.position ?? current.rows[0].position)) ? Number(b.position ?? current.rows[0].position) : 0,
      JSON.stringify(Array.isArray(b.options) ? b.options : normalizeArray(current.rows[0].options)),
      JSON.stringify(b.scoring || normalizeJson(current.rows[0].scoring)),
      JSON.stringify(b.config || normalizeJson(current.rows[0].config)),
      Boolean(b.active ?? current.rows[0].active),
    ]
  );
  await touchQuestionnaireVersion(questionnaireId);
  res.json({ question: rowQuestionnaireQuestion(result.rows[0]), questionnaire: await getQuestionnaireDetail(questionnaireId, true) });
}));

app.delete('/questionnaires/:id/questions/:questionId', requireAuth, asyncHandler(async (req, res) => {
  const questionnaireId = firstParam(req.params.id);
  const questionId = firstParam(req.params.questionId);
  const result = await pool.query(
    `update questionnaire_questions set active = false, updated_at = now()
     where id = $1 and questionnaire_id = $2 returning id`,
    [questionId, questionnaireId]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });
  await touchQuestionnaireVersion(questionnaireId);
  res.json({ ok: true, questionnaire: await getQuestionnaireDetail(questionnaireId, true) });
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
  const result = await pool.query(`
    select c.*,
      cq.name as company_questionnaire_name,
      eq.name as employee_questionnaire_name
    from campaigns c
    left join questionnaires cq on cq.id = c.company_questionnaire_id
    left join questionnaires eq on eq.id = c.employee_questionnaire_id
    order by c.created_at desc
  `);
  res.json({ campaigns: result.rows.map(rowCampaign) });
}));

app.post('/campaigns', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const b = req.body;
  const companyQuestionnaire = await resolveQuestionnaire('company', b.companyId, b.companyQuestionnaireId);
  const employeeQuestionnaire = await resolveQuestionnaire('employee', b.companyId, b.employeeQuestionnaireId);
  if (!companyQuestionnaire || !employeeQuestionnaire) return res.status(400).json({ error: 'questionnaire_not_found' });
  const result = await pool.query(
    `insert into campaigns (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_questionnaire_id, employee_questionnaire_id, company_form_token, employee_form_token)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [
      randomUUID(),
      b.companyId,
      b.name,
      b.description || null,
      b.startDate || null,
      b.endDate || null,
      b.employeeFormMode || 'completo',
      b.status || 'ativa',
      companyQuestionnaire.id,
      employeeQuestionnaire.id,
      b.companyFormToken,
      b.employeeFormToken,
    ]
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
    pool.query('select submitted_at from employee_responses order by submitted_at desc limit 20'),
  ]);
  res.json({
    totalCompanies: companies.rows[0].count,
    totalActiveCampaigns: activeCampaigns.rows[0].count,
    totalResponses: emp.rows[0].count + comp.rows[0].count,
    lastEmployeeResponses: last.rows.map((row) => ({ submittedAt: row.submitted_at })),
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
  const [settings, campaign, responses, companyResponses] = await Promise.all([
    getReportSettings(),
    pool.query(
      `select c.*, co.numero_colaboradores
       from campaigns c
       left join companies co on co.id = c.company_id
       where c.id=$1`,
      [req.params.campaignId]
    ),
    pool.query('select * from employee_responses where campaign_id=$1 order by submitted_at desc', [req.params.campaignId]),
    pool.query('select * from company_responses where campaign_id=$1 order by submitted_at desc', [req.params.campaignId]),
  ]);
  const latestCompanyResponse = companyResponses.rows[0];
  const privacy = privacySummary(responses.rowCount || 0, settings.minEmployeeResponses, parseEmployeeCapacity(campaign.rows[0]?.numero_colaboradores));
  const scoredRows = latestCompanyResponse?.scores ? [...responses.rows, { scores: latestCompanyResponse.scores }] : responses.rows;
  const categoryAverages = privacy.analysisAllowed ? calculateCategoryAverages(scoredRows) : [];
  const evidenceQuestions = privacy.analysisAllowed ? await getEmployeeEvidenceQuestions(campaign.rows[0], responses.rows) : [];
  const rawEvidence = privacy.analysisAllowed
    ? calculateEmployeeEvidence(evidenceQuestions, responses.rows)
    : emptyEvidence(responses.rowCount || 0);
  const evidence = privacy.analysisAllowed
    ? ensureEvidenceCoverage(categoryAverages, rawEvidence, responses.rowCount || 0)
    : rawEvidence;
  const technicalFindings = privacy.analysisAllowed ? buildRiskTechnicalFindings(categoryAverages, evidence.categories) : [];
  const reportRecommendations = privacy.analysisAllowed ? buildRiskRecommendations({
    categories: categoryAverages,
    evidence: evidence.categories,
    technicalFindings,
  }) : [];
  const segmentations = privacy.analysisAllowed ? buildAnonymousSegmentations(responses.rows, settings.minEmployeeResponses) : [];
  const institutionalComparison = privacy.analysisAllowed ? buildInstitutionalComparison(calculateCategoryAverages(responses.rows), latestCompanyResponse?.scores) : [];
  const llmAnalysis = buildReportLlmAnalysis({
    privacy,
    categories: categoryAverages,
    evidence,
    technicalFindings,
    reportRecommendations,
    segmentations,
    institutionalComparison,
  });

  res.json({
    campaign: campaign.rows[0] ? rowCampaign(campaign.rows[0]) : null,
    responses: responses.rows.map((r) => ({ id: r.id, submittedAt: r.submitted_at })),
    companyResponses: companyResponses.rows.map((r) => ({ id: r.id, submittedAt: r.submitted_at })),
    summary: {
      employeeResponsesCount: responses.rowCount,
      companyResponseSubmitted: Boolean(companyResponses.rowCount),
      minimumResponsesMet: privacy.minimumResponsesMet,
      minEmployeeResponses: privacy.minEmployeeResponses,
      privacy,
      categoryAverages,
      evidence,
      technicalFindings,
      reportRecommendations,
      segmentations,
      institutionalComparison,
      llmAnalysis,
    },
  });
}));

app.get('/reports/:campaignId', requireAuth, asyncHandler(async (req, res) => {
  const settings = await getReportSettings();
  const campaign = await pool.query('select * from campaigns where id=$1', [req.params.campaignId]);
  const company = campaign.rows[0] ? await pool.query('select * from companies where id=$1', [campaign.rows[0].company_id]) : { rows: [] };
  const responses = await pool.query('select * from employee_responses where campaign_id=$1', [req.params.campaignId]);
  const companyResponses = await pool.query('select * from company_responses where campaign_id=$1 order by submitted_at desc', [req.params.campaignId]);
  const latestCompanyResponse = companyResponses.rows[0];
  const privacy = privacySummary(responses.rowCount || 0, settings.minEmployeeResponses, parseEmployeeCapacity(company.rows[0]?.numero_colaboradores));
  const scoredRows = latestCompanyResponse?.scores ? [...responses.rows, { scores: latestCompanyResponse.scores }] : responses.rows;
  const categoryAverages = privacy.analysisAllowed ? calculateCategoryAverages(scoredRows) : [];
  const evidenceQuestions = privacy.analysisAllowed ? await getEmployeeEvidenceQuestions(campaign.rows[0], responses.rows) : [];
  const rawEvidence = privacy.analysisAllowed
    ? calculateEmployeeEvidence(evidenceQuestions, responses.rows)
    : emptyEvidence(responses.rowCount || 0);
  const evidence = privacy.analysisAllowed
    ? ensureEvidenceCoverage(categoryAverages, rawEvidence, responses.rowCount || 0)
    : rawEvidence;
  const technicalFindings = privacy.analysisAllowed ? buildRiskTechnicalFindings(categoryAverages, evidence.categories) : [];
  const reportRecommendations = privacy.analysisAllowed ? buildRiskRecommendations({
    categories: categoryAverages,
    evidence: evidence.categories,
    technicalFindings,
  }) : [];
  const segmentations = privacy.analysisAllowed ? buildAnonymousSegmentations(responses.rows, settings.minEmployeeResponses) : [];
  const institutionalComparison = privacy.analysisAllowed ? buildInstitutionalComparison(calculateCategoryAverages(responses.rows), latestCompanyResponse?.scores) : [];
  const llmAnalysis = buildReportLlmAnalysis({
    privacy,
    categories: categoryAverages,
    evidence,
    technicalFindings,
    reportRecommendations,
    segmentations,
    institutionalComparison,
  });
  res.json({
    campaign: campaign.rows[0] ? rowCampaign(campaign.rows[0]) : null,
    company: company.rows[0] ? rowCompany(company.rows[0]) : null,
    responses: responses.rows.map((r) => ({ id: r.id, submittedAt: r.submitted_at })),
    companyResponses: companyResponses.rows.map((r) => ({ id: r.id, submittedAt: r.submitted_at })),
    summary: {
      employeeResponsesCount: responses.rowCount,
      companyResponseSubmitted: Boolean(companyResponses.rowCount),
      minimumResponsesMet: privacy.minimumResponsesMet,
      minEmployeeResponses: privacy.minEmployeeResponses,
      privacy,
      categoryAverages,
      evidence,
      technicalFindings,
      reportRecommendations,
      segmentations,
      institutionalComparison,
      llmAnalysis,
    },
  });
}));

app.post('/public/diagnostics', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const requiredFields = ['razaoSocial', 'cnpj', 'cidade', 'uf', 'ramoAtividade', 'numeroColaboradores', 'responsavelNome', 'responsavelEmail'];
  const missing = requiredFields.filter((field) => !String(b[field] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'missing_required_fields', fields: missing });

  const client = await pool.connect();
  try {
    await client.query('begin');
    const companyId = randomUUID();
    const campaignId = randomUUID();
    const publicToken = generatePublicToken('diag');
    const companyFormToken = generatePublicToken('emp');
    const employeeFormToken = generatePublicToken('col');
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await client.query(
      `insert into companies (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ativa')`,
      [
        companyId,
        String(b.razaoSocial).trim(),
        String(b.nomeFantasia || '').trim() || null,
        String(b.cnpj).trim(),
        String(b.cidade).trim(),
        String(b.uf).trim().toUpperCase().slice(0, 2),
        String(b.ramoAtividade).trim(),
        String(b.numeroColaboradores).trim(),
        String(b.responsavelNome).trim(),
        String(b.responsavelEmail).trim().toLowerCase(),
        String(b.responsavelTelefone || '').trim() || null,
      ]
    );

    const companyQuestionnaire = await resolveQuestionnaire('company', companyId, null, client);
    const employeeQuestionnaire = await resolveQuestionnaire('employee', companyId, null, client);
    if (!companyQuestionnaire || !employeeQuestionnaire) {
      await client.query('rollback');
      return res.status(400).json({ error: 'questionnaire_not_found' });
    }

    await client.query(
      `insert into campaigns (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_questionnaire_id, employee_questionnaire_id, company_form_token, employee_form_token)
       values ($1,$2,$3,$4,$5,$6,'completo','ativa',$7,$8,$9,$10)`,
      [
        campaignId,
        companyId,
        `Diagnóstico NR-01 - ${String(b.razaoSocial).trim()}`,
        'Diagnóstico público gratuito com PDF técnico pago.',
        now.toISOString(),
        endDate.toISOString(),
        companyQuestionnaire.id,
        employeeQuestionnaire.id,
        companyFormToken,
        employeeFormToken,
      ]
    );

    await client.query(
      `insert into public_diagnostics (id, company_id, campaign_id, public_token, responsible_name, responsible_email, responsible_phone)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        randomUUID(),
        companyId,
        campaignId,
        publicToken,
        String(b.responsavelNome).trim(),
        String(b.responsavelEmail).trim().toLowerCase(),
        String(b.responsavelTelefone || '').trim() || null,
      ]
    );
    await client.query('commit');

    const diagnostic = await getPublicDiagnosticByToken(publicToken);
    res.status(201).json({ diagnostic });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/public/diagnostics/:token', asyncHandler(async (req, res) => {
  const diagnostic = await getPublicDiagnosticByToken(firstParam(req.params.token));
  if (!diagnostic) return res.status(404).json({ error: 'not_found' });
  res.json({ diagnostic });
}));

app.post('/public/diagnostics/:token/checkout', asyncHandler(async (req, res) => {
  const diagnostic = await getPublicDiagnosticByToken(firstParam(req.params.token));
  if (!diagnostic) return res.status(404).json({ error: 'not_found' });
  if (!diagnostic.settings.publicSalesEnabled) return res.status(403).json({ error: 'public_sales_disabled' });
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    return res.status(503).json({ error: 'mercado_pago_not_configured', message: 'Mercado Pago ainda não configurado.' });
  }

  const approved = await getApprovedPaymentOrder(diagnostic.id);
  if (approved) {
    return res.json({ paid: true, payment: rowPaymentOrder(approved), reportUrl: diagnostic.links.reportPdf });
  }

  const reusable = diagnostic.payment;
  if (reusable?.checkoutUrl && ['created', 'pending', 'in_process'].includes(reusable.status)) {
    return res.json({ paid: false, checkoutUrl: reusable.checkoutUrl, payment: reusable });
  }

  const orderId = randomUUID();
  await pool.query(
    `insert into payment_orders (id, public_diagnostic_id, campaign_id, amount_cents, currency, external_reference)
     values ($1,$2,$3,$4,'BRL',$1)`,
    [orderId, diagnostic.id, diagnostic.campaign.id, diagnostic.settings.reportPriceCents]
  );

  try {
    const preference = await createMercadoPagoPreference({
      orderId,
      publicToken: diagnostic.token,
      companyName: diagnostic.company.razaoSocial,
      amountCents: diagnostic.settings.reportPriceCents,
      maxInstallments: diagnostic.settings.maxInstallments,
    });
    const checkoutUrl = preference.init_point || preference.sandbox_init_point;
    const updated = await pool.query(
      `update payment_orders
       set preference_id = $2, checkout_url = $3, raw_payload = $4, updated_at = now()
       where id = $1
       returning *`,
      [orderId, preference.id || null, checkoutUrl || null, JSON.stringify(preference)]
    );
    res.status(201).json({ paid: false, checkoutUrl, payment: rowPaymentOrder(updated.rows[0]) });
  } catch (error) {
    await pool.query("update payment_orders set status = 'expired', updated_at = now() where id = $1", [orderId]);
    throw error;
  }
}));

app.get('/public/diagnostics/:token/payment-status', asyncHandler(async (req, res) => {
  const paymentId = String(req.query.payment_id || req.query.collection_id || '').trim();
  if (paymentId && MERCADO_PAGO_ACCESS_TOKEN) {
    try {
      const payment = await fetchMercadoPagoPayment(paymentId);
      await applyMercadoPagoPayment(payment);
    } catch (error) {
      console.warn('Mercado Pago status sync failed', error);
    }
  }

  const diagnostic = await getPublicDiagnosticByToken(firstParam(req.params.token));
  if (!diagnostic) return res.status(404).json({ error: 'not_found' });
  res.json({
    paid: diagnostic.reportUnlocked,
    payment: diagnostic.payment,
    reportUrl: diagnostic.reportUnlocked ? diagnostic.links.reportPdf : null,
  });
}));

app.get('/public/diagnostics/:token/report.pdf', asyncHandler(async (req, res) => {
  const reportData = await buildReportData(firstParam(req.params.token));
  if (!reportData) return res.status(404).json({ error: 'not_found' });
  const approvedOrder = await getApprovedPaymentOrder(reportData.id);
  if (!approvedOrder) return res.status(403).json({ error: 'payment_required' });

  const pdf = await generateDiagnosticPdf(reportData);
  await pool.query(
    `insert into report_download_audit (id, public_diagnostic_id, payment_order_id, ip_address, user_agent)
     values ($1,$2,$3,$4,$5)`,
    [randomUUID(), reportData.id, approvedOrder.id, req.ip || null, req.headers['user-agent'] || null]
  );

  const fileSlug = String(reportData.company.razaoSocial || 'diagnostico')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 50);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="diagnostico-nr01-${fileSlug || 'empresa'}.pdf"`);
  res.setHeader('Content-Length', String(pdf.length));
  res.send(pdf);
}));

app.post('/webhooks/mercadopago', asyncHandler(async (req, res) => {
  const paymentId = getMercadoPagoPaymentId(req);
  if (!paymentId) return res.status(200).json({ ok: true, ignored: 'missing_payment_id' });
  if (!validateMercadoPagoSignature(req, paymentId)) return res.status(401).json({ error: 'invalid_signature' });

  const payment = await fetchMercadoPagoPayment(paymentId);
  const order = await applyMercadoPagoPayment(payment);
  res.status(200).json({ ok: true, orderId: order?.id || null });
}));

app.get('/public/company-form/:token', asyncHandler(async (req, res) => {
  const result = await pool.query("select * from campaigns where company_form_token=$1 and status='ativa'", [req.params.token]);
  const campaign = result.rows[0];
  if (!campaign) return res.status(404).json({ error: 'not_found' });
  const company = await pool.query('select * from companies where id=$1', [campaign.company_id]);
  const questionnaire = await questionnaireForCampaign(campaign, 'company');
  res.json({
    campaign: rowCampaign(campaign),
    company: company.rows[0] ? rowCompany(company.rows[0]) : null,
    questionnaire: questionnaire ? await getQuestionnaireDetail(questionnaire.id) : null,
  });
}));

app.post('/public/company-responses', asyncHandler(async (req, res) => {
  const b = req.body;
  const active = await pool.query("select * from campaigns where id=$1 and status='ativa'", [b.campaignId]);
  const campaign = active.rows[0];
  if (!campaign) return res.status(403).json({ error: 'campaign_inactive' });
  const questionnaire = await questionnaireForCampaign(campaign, 'company');
  const answers = normalizeJson(b.answers);
  const { scores, missingRequired, version } = await calculateQuestionnaireScores(questionnaire?.id, answers);
  if (missingRequired.length) return res.status(400).json({ error: 'missing_required_answers', fields: missingRequired });
  const result = await pool.query(
    `insert into company_responses (id, campaign_id, company_id, questionnaire_id, questionnaire_version, answers, scores)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [randomUUID(), campaign.id, campaign.company_id, questionnaire?.id || null, version, JSON.stringify(answers || {}), JSON.stringify(scores || {})]
  );
  res.status(201).json({ id: result.rows[0].id });
}));

app.get('/public/employee-form/:token', asyncHandler(async (req, res) => {
  const result = await pool.query("select * from campaigns where employee_form_token=$1 and status='ativa'", [req.params.token]);
  const campaign = result.rows[0];
  if (!campaign) return res.status(404).json({ error: 'not_found' });
  const company = await pool.query('select * from companies where id=$1', [campaign.company_id]);
  const questionnaire = await questionnaireForCampaign(campaign, 'employee');
  res.json({
    campaign: rowCampaign(campaign),
    company: company.rows[0] ? rowCompany(company.rows[0]) : null,
    questionnaire: questionnaire ? await getQuestionnaireDetail(questionnaire.id) : null,
  });
}));

app.post('/public/employee-responses', asyncHandler(async (req, res) => {
  const b = req.body;
  const active = await pool.query("select * from campaigns where id=$1 and status='ativa'", [b.campaignId]);
  const campaign = active.rows[0];
  if (!campaign) return res.status(403).json({ error: 'campaign_inactive' });
  const questionnaire = await questionnaireForCampaign(campaign, 'employee');
  const answers = normalizeJson(b.answers);
  const { scores, missingRequired, version } = await calculateQuestionnaireScores(questionnaire?.id, answers);
  if (missingRequired.length) return res.status(400).json({ error: 'missing_required_answers', fields: missingRequired });
  const result = await pool.query(
    `insert into employee_responses (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
    [
      randomUUID(),
      campaign.id,
      campaign.company_id,
      b.sector,
      b.roleType,
      b.tenure,
      b.workType,
      b.workSchedule,
      questionnaire?.id || null,
      version,
      JSON.stringify(answers || {}),
      JSON.stringify(scores || {}),
    ]
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
