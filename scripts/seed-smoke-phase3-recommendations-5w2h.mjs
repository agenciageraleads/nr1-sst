import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';

const IDS = {
  company: '44444444-4444-4444-8444-444444444101',
  questionnaire: '44444444-4444-4444-8444-444444444201',
  campaign: '44444444-4444-4444-8444-444444444301',
};

const categoryProfiles = [
  { category: 'Sobrecarga e ritmo', key: 'sobrecarga_ritmo', score: 18 },
  { category: 'Assédio e violência', key: 'assedio_violencia', score: 12 },
  { category: 'Bem-estar', key: 'bem_estar', score: 32 },
  { category: 'Fator Experimental Zeta', key: 'fator_experimental_zeta', score: 20 },
  { category: 'Recursos e Processos', key: 'recursos_processos', score: 74 },
];

function questionId(position) {
  return `44444444-4444-4444-8444-444444444${String(position).padStart(3, '0')}`;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function exactScoreOptions(score) {
  return [
    { value: 'critico', label: `Cenario critico (${score}/100)`, score },
    { value: 'moderado', label: 'Cenario moderado', score: clampScore(score + 25) },
    { value: 'controlado', label: 'Cenario controlado', score: clampScore(score + 50) },
  ];
}

const questions = categoryProfiles.flatMap((profile, index) => {
  const position = index * 3 + 1;
  return [
    {
      id: questionId(position),
      questionKey: `smoke_phase3_${profile.key}_driver`,
      text: `SMOKE FASE 3 - ${profile.category}: principal fator observado para recomendacao tecnica.`,
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
      questionKey: `smoke_phase3_${profile.key}_number`,
      text: `SMOKE FASE 3 - ${profile.category}: indicador numerico para compor 5W2H.`,
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
      questionKey: `smoke_phase3_${profile.key}_evidence`,
      text: `SMOKE FASE 3 - ${profile.category}: evidencia complementar rastreavel no relatorio.`,
      category: profile.category,
      questionType: 'select',
      required: true,
      isNegative: false,
      weight: 1,
      position: position + 2,
      options: exactScoreOptions(clampScore(profile.score + 4)),
      scoring: {},
      config: {},
      answer: 'critico',
    },
  ];
});

questions.push({
  id: questionId(98),
  questionKey: 'smoke_phase3_open_comment',
  text: 'SMOKE FASE 3 - Comentario qualitativo fora do calculo de recomendacoes.',
  category: 'Observacao qualitativa',
  questionType: 'textarea',
  required: false,
  isNegative: false,
  weight: 1,
  position: 98,
  options: [],
  scoring: {},
  config: {},
  answer: 'Comentario qualitativo para smoke de Fase 3.',
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
      if (question.questionKey === 'smoke_phase3_open_comment') {
        return [question.questionKey, `Comentario smoke Fase 3 recomendacoes ${responseIndex + 1}`];
      }
      return [question.questionKey, question.answer];
    })
  );
}

const responses = Array.from({ length: 6 }, (_, index) => {
  const answers = buildAnswers(index);
  return {
    id: `44444444-4444-4444-8444-4444444444${String(index + 1).padStart(2, '0')}`,
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
        shouldGenerate5w2h: 100 - score > 40,
        customTemplateExpected: category === 'Fator Experimental Zeta' ? 'fallback sem template especifico' : undefined,
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

    await client.query(
      `insert into companies
        (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values
        ($1, 'SMOKE Fase 3 Recomendacoes Ltda', 'SMOKE Fase 3 5W2H', '00.000.000/0004-34', 'Goiania', 'GO', 'Smoke test de recomendacoes e plano 5W2H', '6', 'Validador Fase 3', 'smoke.phase3@example.com', null, 'ativa')
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
        ($1, 'smoke-phase3-recommendations-5w2h', 'SMOKE Fase 3 - Recomendacoes e 5W2H', 'Questionario smoke para validar recomendacoes prioritarias e plano 5W2H com categorias criticas e fallback customizado.', 'employee', $2, null, 'active', 1, null)
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
        ($1,$2,'SMOKE Fase 3 - Recomendacoes e 5W2H','Campanha local para validar recomendacoes, categorias criticas e fallback 5W2H para categoria personalizada.',now(),now() + interval '90 days','completo','ativa',$3,$4,'smoke_fase3_5w2h_empresa','smoke_fase3_5w2h_colaborador')
       on conflict (id) do update set
        company_id = excluded.company_id,
        name = excluded.name,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        status = excluded.status,
        company_questionnaire_id = excluded.company_questionnaire_id,
        employee_questionnaire_id = excluded.employee_questionnaire_id,
        updated_at = now()`,
      [IDS.campaign, IDS.company, companyQuestionnaireId, IDS.questionnaire]
    );

    await client.query('delete from employee_responses where campaign_id = $1', [IDS.campaign]);
    await client.query('delete from company_responses where campaign_id = $1', [IDS.campaign]);

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

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      companyId: IDS.company,
      questionnaireId: IDS.questionnaire,
      campaignId: IDS.campaign,
      employeeResponses: responses.length,
      scorableQuestions: questions.filter((question) => question.questionType !== 'textarea').length,
      expectedCategories: summarizeScores(),
      expectedCriticalCategories: summarizeScores().filter((category) => category.shouldGenerate5w2h).map((category) => category.category),
      customFallbackCategory: 'Fator Experimental Zeta',
      resultsUrl: `http://localhost:3000/campanhas/${IDS.campaign}/resultados`,
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
