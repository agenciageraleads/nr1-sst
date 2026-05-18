import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const IDS = {
  company: '66666666-6666-4666-8666-666666666101',
  campaign: '66666666-6666-4666-8666-666666666301',
  publicDiagnostic: '66666666-6666-4666-8666-666666666401',
  paymentOrder: '66666666-6666-4666-8666-666666666501',
};

const TOKENS = {
  companyForm: 'smoke_legado_scores_empresa',
  employeeForm: 'smoke_legado_scores_colaborador',
  publicDiagnostic: 'smoke_legado_scores_pdf_pago',
};

const responseScores = [
  {
    id: '66666666-6666-4666-8666-666666666601',
    sector: 'Operacao',
    roleType: 'Operacional',
    scores: {
      'Sobrecarga e ritmo': 24,
      'Assédio e violência': 18,
      'Clareza e autonomia': 52,
      'Fator Legado Personalizado': 31,
      'Recursos e Processos': 82,
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666602',
    sector: 'Atendimento',
    roleType: 'Atendimento',
    scores: {
      'Sobrecarga e ritmo': 28,
      'Assédio e violência': 22,
      'Clareza e autonomia': 56,
      'Fator Legado Personalizado': 35,
      'Recursos e Processos': 78,
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666603',
    sector: 'Cozinha',
    roleType: 'Operacional',
    scores: {
      'Sobrecarga e ritmo': 20,
      'Assédio e violência': 16,
      'Clareza e autonomia': 50,
      'Fator Legado Personalizado': 29,
      'Recursos e Processos': 80,
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666604',
    sector: 'Administrativo',
    roleType: 'Administrativo',
    scores: {
      'Sobrecarga e ritmo': 32,
      'Assédio e violência': 24,
      'Clareza e autonomia': 60,
      'Fator Legado Personalizado': 33,
      'Recursos e Processos': 76,
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666605',
    sector: 'Gestao',
    roleType: 'Lideranca',
    scores: {
      'Sobrecarga e ritmo': 26,
      'Assédio e violência': 20,
      'Clareza e autonomia': 57,
      'Fator Legado Personalizado': 32,
      'Recursos e Processos': 79,
    },
  },
];

function summarizeScores() {
  const categories = {};

  responseScores.forEach((response) => {
    Object.entries(response.scores).forEach(([category, score]) => {
      categories[category] ||= { total: 0, count: 0 };
      categories[category].total += score;
      categories[category].count += 1;
    });
  });

  return Object.entries(categories)
    .map(([category, data]) => {
      const score = Math.round(data.total / data.count);
      return {
        category,
        score,
        risk: 100 - score,
        expectedEvidenceMode: 'legacyAggregate',
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('begin');

    const settings = await client.query('select report_price_cents from report_settings where id = true limit 1');
    const reportPriceCents = settings.rows[0]?.report_price_cents || 49700;

    await client.query(
      `insert into companies
        (id, razao_social, nome_fantasia, cnpj, cidade, uf, ramo_atividade, numero_colaboradores, responsavel_nome, responsavel_email, responsavel_telefone, status)
       values
        ($1, 'SMOKE Legado Scores Ltda', 'SMOKE Legado Scores', '00.000.000/0006-04', 'Goiania', 'GO', 'Smoke test de dados historicos com scores preservados', '5', 'Validador Legado', 'smoke.legado@example.com', null, 'ativa')
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
        ($1,$2,'SMOKE Legado - Scores historicos','Campanha local sem questionario vinculado, simulando amostra antiga importada da VPS somente com scores por categoria.',now(),now() + interval '90 days','completo','ativa',null,null,$3,$4)
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
      [IDS.campaign, IDS.company, TOKENS.companyForm, TOKENS.employeeForm]
    );

    await client.query('delete from employee_responses where campaign_id = $1', [IDS.campaign]);
    await client.query('delete from company_responses where campaign_id = $1', [IDS.campaign]);

    for (const response of responseScores) {
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,$5,'Nao informado','Nao informado','Nao informado',null,1,'{}',$6)`,
        [
          response.id,
          IDS.campaign,
          IDS.company,
          response.sector,
          response.roleType,
          JSON.stringify(response.scores),
        ]
      );
    }

    await client.query(
      `insert into public_diagnostics
        (id, company_id, campaign_id, public_token, responsible_name, responsible_email, responsible_phone, status)
       values
        ($1,$2,$3,$4,'Validador Legado','smoke.legado@example.com',null,'paid')
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
        'smoke-legacy-scores-preference-approved',
        `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}/pagamento?status=approved`,
        IDS.paymentOrder,
        'smoke-legacy-scores-approved-payment',
        'smoke.legado@example.com',
        JSON.stringify({ smoke: true, mode: 'legacy-scores', status: 'approved' }),
      ]
    );

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      mode: 'legacy-scores-only',
      campaignId: IDS.campaign,
      employeeResponses: responseScores.length,
      expectedCategories: summarizeScores(),
      reportUrl: `${APP_URL}/campanhas/${IDS.campaign}/relatorio`,
      resultsUrl: `${APP_URL}/campanhas/${IDS.campaign}/resultados`,
      publicDashboardUrl: `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}`,
      publicReportPdfUrl: `${API_URL}/public/diagnostics/${encodeURIComponent(TOKENS.publicDiagnostic)}/report.pdf`,
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
