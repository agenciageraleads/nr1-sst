import { Client } from 'pg';
import { DEFAULT_EMPLOYEE_V2_QUESTIONS } from '../shared/questionnaires.ts';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';

const IDS = {
  company: '13131313-1313-4313-8313-131313131101',
  campaign: '13131313-1313-4313-8313-131313131301',
};

const EMPLOYEE_FORM_TOKEN = 'smoke_v2_mte_colaborador';
const COMPANY_FORM_TOKEN = 'smoke_v2_mte_empresa';

const segmentRows = [
  ['Operacao', 'Operacional', 'Menos de 1 ano', 'Presencial', 'Comercial'],
  ['Atendimento', 'Atendimento', '1 a 3 anos', 'Presencial', 'Comercial'],
  ['Administrativo', 'Administrativo', '3 a 5 anos', 'Hibrido', 'Comercial'],
  ['Logistica', 'Operacional', '1 a 3 anos', 'Presencial', 'Turno'],
  ['Producao', 'Operacional', 'Mais de 5 anos', 'Presencial', 'Turno'],
  ['Gestao', 'Lideranca', 'Mais de 5 anos', 'Hibrido', 'Comercial'],
];

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreQuestion(question, answer) {
  if (answer === undefined || answer === null || answer === '') return null;
  const numeric = Number(answer);

  if (question.type === 'scale' || question.type === 'frequency') {
    if (!Number.isFinite(numeric) || numeric === 6) return null;
    if (numeric < 1 || numeric > 5) return null;
    const adjusted = question.isNegative ? 6 - numeric : numeric;
    return clampScore((adjusted - 1) * 25);
  }

  return null;
}

function answerForQuestion(question) {
  if (question.type === 'textarea') {
    return 'Campanha smoke v2: respostas extremas para validar todos os 13 fatores MTE no relatorio.';
  }
  return question.isNegative ? 5 : 1;
}

function calculateScores(answers) {
  const categories = {};

  DEFAULT_EMPLOYEE_V2_QUESTIONS.forEach((question) => {
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
    DEFAULT_EMPLOYEE_V2_QUESTIONS.map((question) => [
      question.questionKey,
      question.type === 'textarea'
        ? `Comentario smoke v2 resposta ${responseIndex + 1}: validar relatorio com todos os fatores MTE em risco alto.`
        : answerForQuestion(question),
    ])
  );
}

function summarizeScores(responses) {
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
    .sort((a, b) => a.category.localeCompare(b.category));
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('begin');

    const companyQuestionnaire = await client.query("select id from questionnaires where slug = 'default-company' limit 1");
    const employeeQuestionnaire = await client.query("select id, version from questionnaires where slug = 'default-employee-v2' limit 1");

    if (!employeeQuestionnaire.rows[0]) {
      throw new Error('default-employee-v2 nao encontrado. Inicie a API atualizada uma vez para executar o seed padrao.');
    }

    await client.query(
      `insert into companies
        (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values
        ($1, 'SMOKE V2 Todos os 13 Fatores MTE Ltda', 'SMOKE V2 MTE', '00.000.000/0013-13', 'Goiania', 'GO', 'Smoke test completo de riscos psicossociais', '6', 'Validador Smoke V2', 'smoke.v2.mte@example.com', null, 'ativa')
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
      `insert into campaigns
        (id, company_id, name, description, start_date, end_date, employee_form_mode, status, company_questionnaire_id, employee_questionnaire_id, company_form_token, employee_form_token)
       values
        ($1,$2,'SMOKE V2 - Todos os 13 fatores MTE','Campanha local para validar o relatorio com todas as 13 categorias MTE em risco alto.',now(),now() + interval '90 days','completo','ativa',$3,$4,$5,$6)
       on conflict (id) do update set
        company_id = excluded.company_id,
        name = excluded.name,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        employee_form_mode = excluded.employee_form_mode,
        status = excluded.status,
        company_questionnaire_id = excluded.company_questionnaire_id,
        employee_questionnaire_id = excluded.employee_questionnaire_id,
        company_form_token = excluded.company_form_token,
        employee_form_token = excluded.employee_form_token,
        updated_at = now()`,
      [
        IDS.campaign,
        IDS.company,
        companyQuestionnaire.rows[0]?.id || null,
        employeeQuestionnaire.rows[0].id,
        COMPANY_FORM_TOKEN,
        EMPLOYEE_FORM_TOKEN,
      ]
    );

    await client.query('delete from employee_responses where campaign_id = $1', [IDS.campaign]);
    await client.query('delete from company_responses where campaign_id = $1', [IDS.campaign]);

    const responses = segmentRows.map((segment, index) => {
      const answers = buildAnswers(index);
      return {
        id: `13131313-1313-4313-8313-1313131314${String(index + 1).padStart(2, '0')}`,
        segment,
        answers,
        scores: calculateScores(answers),
      };
    });

    for (const response of responses) {
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          response.id,
          IDS.campaign,
          IDS.company,
          response.segment[0],
          response.segment[1],
          response.segment[2],
          response.segment[3],
          response.segment[4],
          employeeQuestionnaire.rows[0].id,
          employeeQuestionnaire.rows[0].version || 1,
          JSON.stringify(response.answers),
          JSON.stringify(response.scores),
        ]
      );
    }

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      companyId: IDS.company,
      campaignId: IDS.campaign,
      campaignName: 'SMOKE V2 - Todos os 13 fatores MTE',
      employeeQuestionnaireSlug: 'default-employee-v2',
      employeeFormToken: EMPLOYEE_FORM_TOKEN,
      employeeResponses: responses.length,
      totalQuestions: DEFAULT_EMPLOYEE_V2_QUESTIONS.length,
      scorableQuestions: DEFAULT_EMPLOYEE_V2_QUESTIONS.filter((question) => question.type !== 'textarea').length,
      expectedCategories: summarizeScores(responses),
      resultsUrl: `http://localhost:3000/campanhas/${IDS.campaign}/resultados`,
      reportUrl: `http://localhost:3000/campanhas/${IDS.campaign}/relatorio`,
      employeeFormUrl: `http://localhost:3000/formulario/colaborador/${EMPLOYEE_FORM_TOKEN}`,
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
