import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';

const IDS = {
  company: '11111111-1111-4111-8111-111111111101',
  questionnaire: '11111111-1111-4111-8111-111111111201',
  campaign: '11111111-1111-4111-8111-111111111301',
};

const questions = [
  {
    id: '11111111-1111-4111-8111-111111111211',
    questionKey: 'smoke_workload_pressure',
    text: 'SMOKE - A carga de trabalho permite cumprir a jornada sem pressao excessiva.',
    category: 'Sobrecarga personalizada',
    questionType: 'scale',
    required: true,
    isNegative: false,
    weight: 1,
    position: 1,
    options: [
      { value: 1, label: 'Discordo totalmente' },
      { value: 2, label: 'Discordo parcialmente' },
      { value: 3, label: 'Nem concordo, nem discordo' },
      { value: 4, label: 'Concordo parcialmente' },
      { value: 5, label: 'Concordo totalmente' },
      { value: 6, label: 'Nao se aplica' },
    ],
    scoring: {},
    config: {},
  },
  {
    id: '11111111-1111-4111-8111-111111111212',
    questionKey: 'smoke_overtime_frequency',
    text: 'SMOKE - A equipe precisa fazer horas extras com frequencia.',
    category: 'Sobrecarga personalizada',
    questionType: 'frequency',
    required: true,
    isNegative: true,
    weight: 1,
    position: 2,
    options: [
      { value: 1, label: 'Nunca' },
      { value: 2, label: 'Raramente' },
      { value: 3, label: 'As vezes' },
      { value: 4, label: 'Frequentemente' },
      { value: 5, label: 'Sempre' },
      { value: 6, label: 'Prefiro nao responder' },
    ],
    scoring: {},
    config: {},
  },
  {
    id: '11111111-1111-4111-8111-111111111213',
    questionKey: 'smoke_reporting_channel',
    text: 'SMOKE - Existe canal conhecido e confiavel para relatos de assedio ou desrespeito.',
    category: 'Assedio personalizado',
    questionType: 'single_choice',
    required: true,
    isNegative: false,
    weight: 1,
    position: 3,
    options: [
      { value: 'sim', label: 'Sim', score: 100 },
      { value: 'implantacao', label: 'Em implantacao', score: 50 },
      { value: 'nao', label: 'Nao', score: 0 },
    ],
    scoring: {},
    config: {},
  },
  {
    id: '11111111-1111-4111-8111-111111111214',
    questionKey: 'smoke_stress_level',
    text: 'SMOKE - Nivel de estresse percebido no trabalho, de 0 a 10.',
    category: 'Bem-estar personalizado',
    questionType: 'number',
    required: true,
    isNegative: true,
    weight: 1,
    position: 4,
    options: [],
    scoring: { min: 0, max: 10 },
    config: { display: 'range', min: 0, max: 10, step: 1 },
  },
  {
    id: '11111111-1111-4111-8111-111111111215',
    questionKey: 'smoke_open_comment',
    text: 'SMOKE - Comentario aberto que nao deve entrar no score estatistico.',
    category: 'Percepcao qualitativa',
    questionType: 'textarea',
    required: false,
    isNegative: false,
    weight: 1,
    position: 5,
    options: [],
    scoring: {},
    config: {},
  },
];

const responses = [
  {
    id: '11111111-1111-4111-8111-111111111401',
    sector: 'Operacao',
    answers: {
      smoke_workload_pressure: 1,
      smoke_overtime_frequency: 5,
      smoke_reporting_channel: 'nao',
      smoke_stress_level: 9,
      smoke_open_comment: 'SMOKE comentario 1',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111402',
    sector: 'Operacao',
    answers: {
      smoke_workload_pressure: 2,
      smoke_overtime_frequency: 4,
      smoke_reporting_channel: 'nao',
      smoke_stress_level: 8,
      smoke_open_comment: 'SMOKE comentario 2',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111403',
    sector: 'Logistica',
    answers: {
      smoke_workload_pressure: 2,
      smoke_overtime_frequency: 5,
      smoke_reporting_channel: 'implantacao',
      smoke_stress_level: 7,
      smoke_open_comment: 'SMOKE comentario 3',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111404',
    sector: 'Logistica',
    answers: {
      smoke_workload_pressure: 3,
      smoke_overtime_frequency: 4,
      smoke_reporting_channel: 'nao',
      smoke_stress_level: 8,
      smoke_open_comment: 'SMOKE comentario 4',
    },
  },
  {
    id: '11111111-1111-4111-8111-111111111405',
    sector: 'Administrativo',
    answers: {
      smoke_workload_pressure: 2,
      smoke_overtime_frequency: 6,
      smoke_reporting_channel: 'implantacao',
      smoke_stress_level: 6,
      smoke_open_comment: 'SMOKE comentario 5 com resposta 6 ignorada na frequencia',
    },
  },
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

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

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('begin');

    const defaultCompanyQuestionnaire = await client.query(
      "select id from questionnaires where slug = 'default-company' limit 1"
    );
    const companyQuestionnaireId = defaultCompanyQuestionnaire.rows[0]?.id || null;

    await client.query(
      `insert into companies
        (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values
        ($1, 'SMOKE Fase 1 Evidencias Ltda', 'SMOKE Fase 1', '00.000.000/0001-91', 'Goiania', 'GO', 'Smoke test de software', '5', 'Usuario Smoke', 'smoke.phase1@example.com', null, 'ativa')
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
        status = excluded.status,
        updated_at = now()`,
      [IDS.company]
    );

    await client.query(
      `insert into questionnaires
        (id, slug, name, description, form_type, company_id, parent_id, status, version, created_by)
       values
        ($1, 'smoke-phase1-employee', 'SMOKE Fase 1 - Questionario personalizado', 'Questionario com escala, frequencia invertida, opcao pontuada e numero pontuado.', 'employee', $2, null, 'active', 1, null)
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
        ($1,$2,'SMOKE Fase 1 - Evidencias por pergunta','Campanha local para validar explicabilidade do relatorio.',now(),now() + interval '30 days','completo','ativa',$3,$4,'smoke_fase1_empresa','smoke_fase1_colaborador')
       on conflict (id) do update set
        company_id = excluded.company_id,
        name = excluded.name,
        description = excluded.description,
        status = excluded.status,
        company_questionnaire_id = excluded.company_questionnaire_id,
        employee_questionnaire_id = excluded.employee_questionnaire_id,
        updated_at = now()`,
      [IDS.campaign, IDS.company, companyQuestionnaireId, IDS.questionnaire]
    );

    await client.query('delete from employee_responses where campaign_id = $1', [IDS.campaign]);
    await client.query('delete from company_responses where campaign_id = $1', [IDS.campaign]);

    for (const response of responses) {
      const scores = calculateScores(response.answers);
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,'Operacional','1 a 3 anos','Presencial','Comercial',$5,1,$6,$7)`,
        [
          response.id,
          IDS.campaign,
          IDS.company,
          response.sector,
          IDS.questionnaire,
          JSON.stringify(response.answers),
          JSON.stringify(scores),
        ]
      );
    }

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      companyId: IDS.company,
      questionnaireId: IDS.questionnaire,
      campaignId: IDS.campaign,
      employeeResponses: responses.length,
      resultsUrl: `http://localhost:3000/campanhas/${IDS.campaign}/resultados`,
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
