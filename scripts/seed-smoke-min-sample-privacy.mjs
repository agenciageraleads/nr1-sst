import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const IDS = {
  company: '77777777-7777-4777-8777-777777777101',
  campaign: '77777777-7777-4777-8777-777777777301',
  publicDiagnostic: '77777777-7777-4777-8777-777777777401',
  paymentOrder: '77777777-7777-4777-8777-777777777501',
};

const TOKENS = {
  companyForm: 'smoke_privacidade_minima_empresa',
  employeeForm: 'smoke_privacidade_minima_colaborador',
  publicDiagnostic: 'smoke_privacidade_minima_pdf_pago',
};

const responses = [
  { id: '77777777-7777-4777-8777-777777777601', scores: { 'Sobrecarga e ritmo': 15, 'Assédio e violência': 20 } },
  { id: '77777777-7777-4777-8777-777777777602', scores: { 'Sobrecarga e ritmo': 25, 'Assédio e violência': 30 } },
  { id: '77777777-7777-4777-8777-777777777603', scores: { 'Sobrecarga e ritmo': 20, 'Assédio e violência': 25 } },
];

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
        ($1, 'SMOKE Privacidade Amostra Minima Ltda', 'SMOKE Amostra Minima', '00.000.000/0007-87', 'Goiania', 'GO', 'Smoke test de bloqueio por amostra minima', '3', 'Validador Privacidade', 'smoke.privacidade@example.com', null, 'ativa')
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
        ($1,$2,'SMOKE Privacidade - Amostra minima','Campanha local para validar bloqueio de relatorio abaixo da amostra minima anonima.',now(),now() + interval '90 days','completo','ativa',null,null,$3,$4)
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

    for (const response of responses) {
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,'Grupo pequeno','Nao informado','Nao informado','Nao informado','Nao informado',null,1,'{}',$4)`,
        [response.id, IDS.campaign, IDS.company, JSON.stringify(response.scores)]
      );
    }

    await client.query(
      `insert into public_diagnostics
        (id, company_id, campaign_id, public_token, responsible_name, responsible_email, responsible_phone, status)
       values
        ($1,$2,$3,$4,'Validador Privacidade','smoke.privacidade@example.com',null,'paid')
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
        'smoke-min-sample-preference-approved',
        `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}/pagamento?status=approved`,
        IDS.paymentOrder,
        'smoke-min-sample-approved-payment',
        'smoke.privacidade@example.com',
        JSON.stringify({ smoke: true, mode: 'min-sample-privacy', status: 'approved' }),
      ]
    );

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      expected: {
        employeeResponses: responses.length,
        minimumResponsesMet: false,
        categoryAverages: 0,
        evidenceCategories: 0,
        recommendations: 0,
      },
      campaignId: IDS.campaign,
      reportUrl: `${APP_URL}/campanhas/${IDS.campaign}/relatorio`,
      resultsUrl: `${APP_URL}/campanhas/${IDS.campaign}/resultados`,
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
