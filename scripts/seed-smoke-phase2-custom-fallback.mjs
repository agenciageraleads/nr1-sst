import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';

const IDS = {
  company: '33333333-3333-4333-8333-333333333101',
  questionnaire: '33333333-3333-4333-8333-333333333201',
  campaign: '33333333-3333-4333-8333-333333333301',
};

const category = 'Fator Psicossocial Customizado';

const questions = [
  {
    id: '33333333-3333-4333-8333-333333333211',
    questionKey: 'smoke_phase2_custom_driver',
    text: 'SMOKE FASE 2 - Fator customizado sem biblioteca tecnica especifica.',
    questionType: 'single_choice',
    answer: 'critico',
    options: [
      { value: 'critico', label: 'Cenario critico', score: 15 },
      { value: 'moderado', label: 'Cenario moderado', score: 45 },
      { value: 'controlado', label: 'Cenario controlado', score: 90 },
    ],
    position: 1,
  },
  {
    id: '33333333-3333-4333-8333-333333333212',
    questionKey: 'smoke_phase2_custom_number',
    text: 'SMOKE FASE 2 - Indicador numerico customizado.',
    questionType: 'number',
    answer: 22,
    options: [],
    scoring: { min: 0, max: 100 },
    config: { display: 'range', min: 0, max: 100, step: 1 },
    position: 2,
  },
  {
    id: '33333333-3333-4333-8333-333333333213',
    questionKey: 'smoke_phase2_custom_open',
    text: 'SMOKE FASE 2 - Comentario aberto fora do calculo.',
    questionType: 'textarea',
    answer: 'Comentario fora do score.',
    options: [],
    position: 3,
  },
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreQuestion(question, answer) {
  if (answer === undefined || answer === null || answer === '') return null;

  if (question.questionType === 'single_choice' || question.questionType === 'select') {
    const option = question.options.find((item) => String(item.value) === String(answer));
    const optionScore = Number(option?.score);
    return Number.isFinite(optionScore) ? clampScore(optionScore) : null;
  }

  if (question.questionType === 'number') {
    const numeric = Number(answer);
    if (!Number.isFinite(numeric)) return null;
    const min = Number(question.scoring?.min ?? 0);
    const max = Number(question.scoring?.max ?? 100);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;
    return clampScore(((numeric - min) / (max - min)) * 100);
  }

  return null;
}

function calculateScores(answers) {
  let total = 0;
  let count = 0;

  questions.forEach((question) => {
    const score = scoreQuestion(question, answers[question.questionKey]);
    if (score === null) return;
    total += score;
    count += 1;
  });

  return count ? { [category]: clampScore(total / count) } : {};
}

function response(index) {
  const answers = Object.fromEntries(questions.map((question) => [question.questionKey, question.answer]));
  return {
    id: `33333333-3333-4333-8333-3333333334${String(index + 1).padStart(2, '0')}`,
    sector: ['Operacao', 'Atendimento', 'Administrativo', 'Logistica', 'Gestao'][index],
    answers,
    scores: calculateScores(answers),
  };
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
        ($1, 'SMOKE Fase 2 Fallback Ltda', 'SMOKE Fase 2', '00.000.000/0003-53', 'Goiania', 'GO', 'Smoke test fallback tecnico', '5', 'Validador Fase 2', 'smoke.phase2@example.com', null, 'ativa')
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
        ($1, 'smoke-phase2-custom-fallback', 'SMOKE Fase 2 - Categoria customizada sem template', 'Questionario para validar fallback de interpretacao tecnica por categoria.', 'employee', $2, null, 'active', 1, null)
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
          ($1,$2,$3,$4,null,$5,$6,true,false,1,$7,$8,$9,$10,true)`,
        [
          question.id,
          IDS.questionnaire,
          question.questionKey,
          question.text,
          category,
          question.questionType,
          question.position,
          JSON.stringify(question.options || []),
          JSON.stringify(question.scoring || {}),
          JSON.stringify(question.config || {}),
        ]
      );
    }

    await client.query(
      `insert into campaigns
        (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_questionnaire_id, employee_questionnaire_id, company_form_token, employee_form_token)
       values
        ($1,$2,'SMOKE Fase 2 - Fallback tecnico','Campanha local para validar categoria personalizada sem template tecnico.',now(),now() + interval '30 days','completo','ativa',$3,$4,'smoke_fase2_empresa','smoke_fase2_colaborador')
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

    for (let index = 0; index < 5; index += 1) {
      const item = response(index);
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,'Operacional','1 a 3 anos','Presencial','Comercial',$5,1,$6,$7)`,
        [
          item.id,
          IDS.campaign,
          IDS.company,
          item.sector,
          IDS.questionnaire,
          JSON.stringify(item.answers),
          JSON.stringify(item.scores),
        ]
      );
    }

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      companyId: IDS.company,
      questionnaireId: IDS.questionnaire,
      campaignId: IDS.campaign,
      employeeResponses: 5,
      expectedCategory: category,
      reportUrl: `http://localhost:3000/campanhas/${IDS.campaign}/relatorio`,
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

