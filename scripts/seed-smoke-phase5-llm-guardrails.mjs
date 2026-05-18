import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://nr1:nr1@localhost:5432/nr1_sst';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const IDS = {
  company: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa101',
  campaign: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa301',
  companyResponse: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa351',
  publicDiagnostic: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa401',
  paymentOrder: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa501',
};

const TOKENS = {
  companyForm: 'smoke_fase5_llm_empresa',
  employeeForm: 'smoke_fase5_llm_colaborador',
  publicDiagnostic: 'smoke_fase5_llm_pdf_pago',
};

const baseScores = {
  operacional: {
    'Sobrecarga e ritmo': 24,
    'Assédio e violência': 48,
    'Clareza e autonomia': 54,
    'Bem-estar': 42,
    'Recursos e Processos': 38,
  },
  administrativo: {
    'Sobrecarga e ritmo': 62,
    'Assédio e violência': 76,
    'Clareza e autonomia': 82,
    'Bem-estar': 74,
    'Recursos e Processos': 78,
  },
};

const responses = Array.from({ length: 10 }, (_, index) => {
  const operacional = index < 5;
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa${String(601 + index)}`,
    sector: operacional ? 'Operacao' : 'Administrativo',
    roleType: operacional ? 'Operacional' : 'Administrativo',
    tenure: operacional ? 'Ate 1 ano' : 'Mais de 3 anos',
    workType: operacional ? 'Presencial' : 'Hibrido',
    workSchedule: operacional ? 'Escala' : 'Comercial',
    scores: operacional ? baseScores.operacional : baseScores.administrativo,
  };
});

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
        ($1, 'SMOKE Fase 5 Guardrails Ltda', 'SMOKE Fase 5 Guardrails', '00.000.000/0010-07', 'Goiania', 'GO', 'Smoke test de governanca tecnica auditavel', '10', 'Validador Fase 5', 'smoke.phase5@example.com', null, 'ativa')
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
        ($1,$2,'SMOKE Fase 5 - Governanca tecnica','Campanha local para validar payload agregado, auditoria e bloqueio de dados crus para LLM.',now(),now() + interval '90 days','completo','ativa',null,null,$3,$4)
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

    await client.query(
      `insert into company_responses
        (id, campaign_id, company_id, questionnaire_id, questionnaire_version, answers, scores)
       values
        ($1,$2,$3,null,1,$4,$5)`,
      [
        IDS.companyResponse,
        IDS.campaign,
        IDS.company,
        JSON.stringify({ smoke_phase5_context: 'Formulario institucional agregado para comparativo.' }),
        JSON.stringify({
          'Sobrecarga e ritmo': 70,
          'Assédio e violência': 74,
          'Clareza e autonomia': 78,
          'Bem-estar': 76,
          'Recursos e Processos': 80,
        }),
      ]
    );

    for (const response of responses) {
      await client.query(
        `insert into employee_responses
          (id, campaign_id, company_id, sector, role_type, tenure, work_type, work_schedule, questionnaire_id, questionnaire_version, answers, scores)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,null,1,'{}',$9)`,
        [
          response.id,
          IDS.campaign,
          IDS.company,
          response.sector,
          response.roleType,
          response.tenure,
          response.workType,
          response.workSchedule,
          JSON.stringify(response.scores),
        ]
      );
    }

    await client.query(
      `insert into public_diagnostics
        (id, company_id, campaign_id, public_token, responsible_name, responsible_email, responsible_phone, status)
       values
        ($1,$2,$3,$4,'Validador Fase 5','smoke.phase5@example.com',null,'paid')
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
        'smoke-phase5-llm-preference-approved',
        `${APP_URL}/diagnostico/${TOKENS.publicDiagnostic}/pagamento?status=approved`,
        IDS.paymentOrder,
        'smoke-phase5-llm-approved-payment',
        'smoke.phase5@example.com',
        JSON.stringify({ smoke: true, phase: 5, status: 'approved' }),
      ]
    );

    await client.query('commit');

    console.log(JSON.stringify({
      ok: true,
      campaignId: IDS.campaign,
      employeeResponses: responses.length,
      expected: {
        llmStatusDefault: 'disabled',
        rawAnswersIncluded: false,
        rawScoresByPersonIncluded: false,
        personalIdentifiersIncluded: false,
        validationPassed: true,
      },
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
