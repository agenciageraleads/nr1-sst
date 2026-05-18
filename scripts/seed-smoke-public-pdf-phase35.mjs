import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const IDS = {
  company: '55555555-5555-4555-8555-555555555101',
  questionnaire: '55555555-5555-4555-8555-555555555201',
  campaign: '55555555-5555-4555-8555-555555555301',
  publicDiagnostic: '55555555-5555-4555-8555-555555555401',
  paymentOrder: '55555555-5555-4555-8555-555555555501',
  companyResponse: '55555555-5555-4555-8555-555555555601',
};

const TOKENS = {
  publicDiagnostic: 'smoke_fase35_pdf_pago',
  companyForm: 'smoke_fase35_pdf_pago_empresa',
  employeeForm: 'smoke_fase35_pdf_pago_colaborador',
};

const categoryProfiles = [
  { category: 'Sobrecarga e ritmo', key: 'sobrecarga_ritmo', score: 14 },
  { category: 'Assédio e violência', key: 'assedio_violencia', score: 18 },
  { category: 'Bem-estar', key: 'bem_estar', score: 29 },
  { category: 'Fator Publico Customizado Omega', key: 'fator_publico_customizado_omega', score: 24 },
  { category: 'Recursos e Processos', key: 'recursos_processos', score: 82 },
];

function questionId(position) {
  return `55555555-5555-4555-8555-555555555${String(position).padStart(3, '0')}`;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function exactScoreOptions(score) {
  return [
    { value: 'critico', label: `Cenario critico (${score}/100)`, score },
    { value: 'atencao', label: 'Cenario em atencao', score: clampScore(score + 25) },
    { value: 'controlado', label: 'Cenario controlado', score: clampScore(score + 50) },
  ];
}

const questions = categoryProfiles.flatMap((profile, index) => {
  const position = index * 3 + 1;
  return [
    {
      id: questionId(position),
      questionKey: `smoke_phase35_${profile.key}_driver`,
      text: `SMOKE FASE 3.5 PDF PUBLICO - ${profile.category}: fator principal para validar PDF pago.`,
      category: profile.category,
      questionType: 'single_choice',
      required: true,
      isNegative: false,
      weight: 1,
      position,
      options: exactScoreOptions(profile.score),
      scoring: {},
      config: {},
      answer: 'critico',
    },
    {
      id: questionId(position + 1),
      questionKey: `smoke_phase35_${profile.key}_number`,
      text: `SMOKE FASE 3.5 PDF PUBLICO - ${profile.category}: indicador numerico rastreavel.`,
      category: profile.category,
      questionType: 'number',
      required: true,
      isNegative: false,
      weight: 1,
      position: position + 1,
      options: [],
      scoring: { min: 0, max: 100 },
      config: { display: 'range', min: 0, max: 100, step: 1 },
      answer: profile.score,
    },
    {
      id: questionId(position + 2),
      questionKey: `smoke_phase35_${profile.key}_evidence`,
      text: `SMOKE FASE 3.5 PDF PUBLICO - ${profile.category}: evidencia complementar para plano de acao.`,
      category: profile.category,
      questionType: 'select',
      required: true,
      isNegative: false,
      weight: 1,
      position: position + 2,
      options: exactScoreOptions(clampScore(profile.score + 6)),
      scoring: {},
      config: {},
      answer: 'critico',
    },
  ];
});

questions.push({
  id: questionId(98),
  questionKey: 'smoke_phase35_open_comment',
  text: 'SMOKE FASE 3.5 PDF PUBLICO - Comentario qualitativo fora do score.',
  category: 'Observacao qualitativa',
  questionType: 'textarea',
  required: false,
  isNegative: false,
  weight: 1,
  position: 98,
  options: [],
  scoring: {},
  config: {},
  answer: 'Comentario qualitativo para validar PDF publico pago.',
});

function scoreQuestion(question, answer) {
  if (answer === undefined || answer === null || answer === '') return null;
  const numeric = Number(answer);

  if (question.questionType === 'scale' || question.questionType === 'frequency') {
    if (!Number.isFinite(numeric) || numeric === 6) return null;
    if (numeric < 1 || numeric > 5) return null;
    const adjusted = question.isNegative ? 6 - numeric : numeric;
    return clampScore((adjusted - 1) * 25);
  }

  if (question.questionType === 'single_choice' || question.questionType === 'select') {
    const option = question.options.find((item) => String(item.value) === String(answer) || String(item.label) === String(answer));
    const optionScore = Number(option?.score);
    return Number.isFinite(optionScore) ? clampScore(optionScore) : null;
  }

  if (question.questionType === 'number') {
    if (!Number.isFinite(numeric)) return null;
    const min = Number(question.scoring.min ?? 0);
    const max = Number(question.scoring.max ?? 100);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;
    const normalized = ((numeric - min) / (max - min)) * 100;
    return clampScore(question.isNegative ? 100 - normalized : normalized);
  }

  return null;
}

function calculateScores(answers) {
  const categories = {};

  questions.forEach((question) => {
    const score = scoreQuestion(question, answers[question.questionKey]);
    if (score === null) return;
    const weight = Number.isFinite(Number(question.weight)) && Number(question.weight) > 0 ? Number(question.weight) : 1;
    categories[question.category] ||= { total: 0, weight: 0 };
    categories[question.category].total += score * weight;
    categories[question.category].weight += weight;
  });

  return Object.fromEntries(
    Object.entries(categories).map(([category, data]) => [category, clampScore(data.total / data.weight)])
  );
}

function buildAnswers(responseIndex) {
  return Object.fromEntries(
    questions.map((question) => {
      if (question.questionKey === 'smoke_phase35_open_comment') {
        return [question.questionKey, `Comentario smoke Fase 3.5 PDF publico pago ${responseIndex + 1}`];
      }
      return [question.questionKey, question.answer];
    })
  );
}

const responses = Array.from({ length: 6 }, (_, index) => {
  const answers = buildAnswers(index);
  return {
    id: `55555555-5555-4555-8555-5555555554${String(index + 1).padStart(2, '0')}`,
    sector: ['Operacao', 'Cozinha', 'Atendimento', 'Administrativo', 'Logistica', 'Gestao'][index],
    roleType: ['Operacional', 'Operacional', 'Atendimento', 'Administrativo', 'Operacional', 'Lideranca'][index],
    answers,
    scores: calculateScores(answers),
  };
});

function summarizeScores() {
  const categories = {};
  responses.forEach((response) => {
    Object.entries(response.scores).forEach(([category, score]) => {
      categories[category] ||= { total: 0, count: 0 };
      categories[category].total += score;
      categories[category].count += 1;
    });
  });

  return Object.entries(categories)
    .map(([category, data]) => {
      const score = clampScore(data.total / data.count);
      return {
        category,
        score,
        risk: 100 - score,
        critical: 100 - score > 40,
        customTemplateExpected: category === 'Fator Publico Customizado Omega' ? 'fallback sem template especifico' : undefined,
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('begin');

    const defaultCompanyQuestionnaire = await client.query(
      "select id from questionnaires where slug = 'default-company' limit 1"
    );
    const companyQuestionnaireId = defaultCompanyQuestionnaire.rows[0]?.id || null;
    const settings = await client.query('select report_price_cents from report_settings where id = true limit 1');
    const reportPriceCents = Number(settings.rows[0]?.report_price_cents) || 49700;

    await client.query(
      `insert into companies
        (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values
        ($1, 'SMOKE Fase 3.5 PDF Publico Pago Ltda', 'SMOKE Fase 3.5 PDF', '00.000.000/0005-15', 'Goiania', 'GO', 'Smoke test de PDF publico pago', '6', 'Validador Fase 3.5', 'smoke.phase35@example.com', null, 'ativa')
       on conflict (id) do update set
        razao_social = excluded.razao_social,
        nome_fantasia = excluded.nome_fantasia,
        cnpj = excluded.cnpj,
        cidade = excluded.cidade,
        uf = excluded.uf,
        ramo_atividade = excluded.ramo_atividade,
        numero_colaboradores = excluded.numero_colaboradores,
        responsavel_nome = excluded.responsavel_nome,
        responsavel_email = excluded.responsavel_email,
        responsavel_telefone = excluded.responsavel_telefone,
        status = excluded.status,
        updated_at = now()`,
      [IDS.company]
    );

    await client.query(
      `insert into questionnaires
        (id, slug, name, description, form_type, company_id, parent_id, status, version, created_by)
       values
        ($1, 'smoke-public-pdf-phase35', 'SMOKE Fase 3.5 - PDF publico pago', 'Questionario smoke para validar dashboard publico, categorias criticas, fallback customizado e PDF pago liberado.', 'employee', $2, null, 'active', 1, null)
       on conflict (id) do update set
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        form_type = excluded.form_type,
        company_id = excluded.company_id,
        status = excluded.status,
        version = 1,
        updated_at = now()`,
      [IDS.questionnaire, IDS.company]
    );

    await client.query('delete from questionnaire_questions where questionnaire_id = $1', [IDS.questionnaire]);
    for (const question of questions) {
      await client.query(
        `insert into questionnaire_questions
          (id, questionnaire_id, question_key, text, description, category, question_type, required, is_negative, weight, position, options, scoring, config, active)
         values
          ($1,$2,$3,$4,null,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)`,
        [
          question.id,
          IDS.questionnaire,
          question.questionKey,
          question.text,
          question.category,
          question.questionType,
          question.required,
          question.isNegative,
          question.weight,
          question.position,
          JSON.stringify(question.options),
          JSON.stringify(question.scoring),
          JSON.stringify(question.config),
        ]
      );
    }

    await client.query(
      `insert into campaigns
        (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_questionnaire_id, employee_questionnaire_id, company_form_token, employee_form_token)
       values
        ($1,$2,'SMOKE Fase 3.5 - PDF publico pago','Campanha publica local para validar download de PDF liberado por payment_order aprovado.',now(),now() + interval '90 days','completo','ativa',$3,$4,$5,$6)
       on conflict (id) do update set
        company_id = excluded.company_id,
        name = excluded.name,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        status = excluded.status,
        company_questionnaire_id = excluded.company_questionnaire_id,
        employee_questionnaire_id = excluded.employee_questionnaire_id,
        company_form_token = excluded.company_form_token,
        employee_form_token = excluded.employee_form_token,
        updated_at = now()`,
      [IDS.campaign, IDS.company, companyQuestionnaireId, IDS.questionnaire, TOKENS.companyForm, TOKENS.employeeForm]
    );

    await client.query('delete from employee_responses where campaign_id = $1', [IDS.campaign]);
    await client.query('delete from company_responses where campaign_id = $1', [IDS.campaign]);

    await client.query(
      `insert into company_responses
        (id, campaign_id, company_id, questionnaire_id, questionnaire_version, answers, scores)
       values
        ($1,$2,$3,$4,1,$5,$6)`,
      [
        IDS.companyResponse,
        IDS.campaign,
        IDS.company,
        companyQuestionnaireId,
        JSON.stringify({
          smoke_phase35_company_context: 'Empresa criada para smoke de PDF publico pago.',
          smoke_phase35_payment_context: 'Payment order aprovado manualmente pelo seed.',
        }),
        JSON.stringify({ 'Contexto institucional': 72 }),
      ]
    );

    for (const response of responses) {
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,$5,'1 a 3 anos','Presencial','Comercial',$6,1,$7,$8)`,
        [
          response.id,
          IDS.campaign,
          IDS.company,
          response.sector,
          response.roleType,
          IDS.questionnaire,
          JSON.stringify(response.answers),
          JSON.stringify(response.scores),
        ]
      );
    }

    await client.query(
      `insert into public_diagnostics
        (id, company_id, campaign_id, public_token, responsible_name, responsible_email, responsible_phone, status)
       values
        ($1,$2,$3,$4,'Validador Fase 3.5','smoke.phase35@example.com',null,'paid')
       on conflict (id) do update set
        company_id = excluded.company_id,
        campaign_id = excluded.campaign_id,
        public_token = excluded.public_token,
        responsible_name = excluded.responsible_name,
        responsible_email = excluded.responsible_email,
        responsible_phone = excluded.responsible_phone,
        status = excluded.status,
        updated_at = now()`,
      [IDS.publicDiagnostic, IDS.company, IDS.campaign, TOKENS.publicDiagnostic]
    );

    await client.query(
      `insert into payment_orders
        (id, public_diagnostic_id, campaign_id, provider, status, amount_cents, currency, preference_id, checkout_url, external_reference, provider_payment_id, provider_status, provider_status_detail, payer_email, paid_at, raw_payload)
       values
        ($1,$2,$3,'mercadopago','approved',$4,'BRL',$5,$6,$7,$8,'approved','accredited',$9,now(),$10)
       on conflict (id) do update set
        public_diagnostic_id = excluded.public_diagnostic_id,
        campaign_id = excluded.campaign_id,
        status = excluded.status,
        amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        preference_id = excluded.preference_id,
        checkout_url = excluded.checkout_url,
        external_reference = excluded.external_reference,
        provider_payment_id = excluded.provider_payment_id,
        provider_status = excluded.provider_status,
        provider_status_detail = excluded.provider_status_detail,
        payer_email = excluded.payer_email,
        paid_at = coalesce(payment_orders.paid_at, now()),
        raw_payload = excluded.raw_payload,
        updated_at = now()`,
      [
        IDS.paymentOrder,
        IDS.publicDiagnostic,
        IDS.campaign,
        reportPriceCents,
        'smoke-phase35-preference-approved',
        `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}/pagamento?status=approved`,
        IDS.paymentOrder,
        'smoke-phase35-approved-payment',
        'smoke.phase35@example.com',
        JSON.stringify({ smoke: true, phase: '3.5', status: 'approved' }),
      ]
    );

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      publicDashboardUrl: `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}`,
      publicReportPdfUrl: `${API_URL}/public/diagnostics/${encodeURIComponent(TOKENS.publicDiagnostic)}/report.pdf`,
      campaignReportUrl: `${APP_URL}/campanhas/${IDS.campaign}/relatorio`,
      ids: {
        companyId: IDS.company,
        questionnaireId: IDS.questionnaire,
        campaignId: IDS.campaign,
        publicDiagnosticId: IDS.publicDiagnostic,
        paymentOrderId: IDS.paymentOrder,
        companyResponseId: IDS.companyResponse,
      },
      tokens: TOKENS,
      paymentOrder: {
        status: 'approved',
        amountCents: reportPriceCents,
        externalReference: IDS.paymentOrder,
      },
      employeeResponses: responses.length,
      scorableQuestions: questions.filter((question) => question.questionType !== 'textarea').length,
      expectedCategories: summarizeScores(),
      expectedCriticalCategories: summarizeScores().filter((category) => category.critical).map((category) => category.category),
      customFallbackCategory: 'Fator Publico Customizado Omega',
    }, null, 2));
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
