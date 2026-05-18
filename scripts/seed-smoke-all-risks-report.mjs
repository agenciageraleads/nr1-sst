import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';

const IDS = {
  company: '22222222-2222-4222-8222-222222222101',
  questionnaire: '22222222-2222-4222-8222-222222222201',
  campaign: '22222222-2222-4222-8222-222222222301',
};

const riskProfiles = [
  { category: 'Sobrecarga e ritmo', key: 'sobrecarga', targetScore: 8 },
  { category: 'Clareza e autonomia', key: 'clareza_autonomia', targetScore: 19 },
  { category: 'Liderança e gestão', key: 'lideranca_gestao', targetScore: 31 },
  { category: 'Relações interpessoais', key: 'relacoes_interpessoais', targetScore: 44 },
  { category: 'Assédio e violência', key: 'assedio_violencia', targetScore: 57 },
  { category: 'Reconhecimento e justiça', key: 'reconhecimento_justica', targetScore: 68 },
  { category: 'Bem-estar', key: 'bem_estar', targetScore: 79 },
  { category: 'Recursos e Processos', key: 'recursos_processos', targetScore: 93 },
];

function questionId(position) {
  return `22222222-2222-4222-8222-222222222${String(position).padStart(3, '0')}`;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function exactScoreOptions(score) {
  return [
    { value: 'observado', label: `Cenario observado (${score}/100)`, score },
    { value: 'intermediario', label: 'Cenario intermediario', score: clampScore(score + 12) },
    { value: 'controlado', label: 'Cenario controlado', score: clampScore(score + 24) },
  ];
}

const questions = riskProfiles.flatMap((profile, index) => {
  const position = index * 3 + 1;
  const lowScore = clampScore(profile.targetScore - 5);
  const highScore = clampScore(profile.targetScore + 5);

  return [
    {
      id: questionId(position),
      questionKey: `smoke_all_${profile.key}_driver`,
      text: `SMOKE TODOS RISCOS - ${profile.category}: indicador mais critico do fator.`,
      category: profile.category,
      questionType: 'single_choice',
      required: true,
      isNegative: false,
      weight: 1,
      position,
      options: exactScoreOptions(lowScore),
      scoring: {},
      config: {},
      answer: 'observado',
    },
    {
      id: questionId(position + 1),
      questionKey: `smoke_all_${profile.key}_number`,
      text: `SMOKE TODOS RISCOS - ${profile.category}: indice numerico configuravel.`,
      category: profile.category,
      questionType: 'number',
      required: true,
      isNegative: false,
      weight: 1,
      position: position + 1,
      options: [],
      scoring: { min: 0, max: 100 },
      config: { display: 'range', min: 0, max: 100, step: 1 },
      answer: profile.targetScore,
    },
    {
      id: questionId(position + 2),
      questionKey: `smoke_all_${profile.key}_control`,
      text: `SMOKE TODOS RISCOS - ${profile.category}: evidencia de controle existente.`,
      category: profile.category,
      questionType: 'select',
      required: true,
      isNegative: false,
      weight: 1,
      position: position + 2,
      options: exactScoreOptions(highScore),
      scoring: {},
      config: {},
      answer: 'observado',
    },
  ];
});

questions.push(
  {
    id: questionId(97),
    questionKey: 'smoke_all_sobrecarga_frequency_skip',
    text: 'SMOKE TODOS RISCOS - A equipe precisa fazer horas extras com muita frequencia.',
    category: 'Sobrecarga e ritmo',
    questionType: 'frequency',
    required: false,
    isNegative: true,
    weight: 0.2,
    position: 97,
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
    answer: 5,
  },
  {
    id: questionId(98),
    questionKey: 'smoke_all_open_comment',
    text: 'SMOKE TODOS RISCOS - Observacao aberta que nao deve entrar no score.',
    category: 'Observacao qualitativa',
    questionType: 'textarea',
    required: false,
    isNegative: false,
    weight: 1,
    position: 98,
    options: [],
    scoring: {},
    config: {},
    answer: 'Texto qualitativo fora do calculo.',
  }
);

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
      if (question.questionKey === 'smoke_all_sobrecarga_frequency_skip' && responseIndex === 0) {
        return [question.questionKey, 6];
      }
      if (question.questionKey === 'smoke_all_open_comment') {
        return [question.questionKey, `Comentario smoke all risks ${responseIndex + 1}`];
      }
      return [question.questionKey, question.answer];
    })
  );
}

const responses = Array.from({ length: 6 }, (_, index) => {
  const answers = buildAnswers(index);
  return {
    id: `22222222-2222-4222-8222-2222222224${String(index + 1).padStart(2, '0')}`,
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
      return { category, score, risk: 100 - score };
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
        ($1, 'SMOKE Todos os Riscos Ltda', 'SMOKE All Risks', '00.000.000/0002-72', 'Goiania', 'GO', 'Smoke test completo de relatorio', '6', 'Validador Smoke', 'smoke.all.risks@example.com', null, 'ativa')
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
        ($1, 'smoke-all-risks-report', 'SMOKE Relatorio - Todos os riscos', 'Questionario smoke para validar todas as categorias de risco, faixas de severidade, evidencias e plano de acao.', 'employee', $2, null, 'active', 1, null)
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
        ($1,$2,'SMOKE Relatorio - Todos os riscos','Campanha local para validar o anexo tecnico com todas as categorias e faixas de risco.',now(),now() + interval '90 days','completo','ativa',$3,$4,'smoke_all_risks_empresa','smoke_all_risks_colaborador')
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
