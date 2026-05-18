export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type AppUser = {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  createdAt?: string;
};

export type QuestionnaireFormType = 'company' | 'employee';

export type QuestionnaireQuestion = {
  id: string;
  questionnaireId: string;
  questionKey: string;
  text: string;
  description?: string | null;
  category: string;
  type: 'scale' | 'frequency' | 'text' | 'textarea' | 'select' | 'single_choice' | 'number' | 'email' | 'checkbox';
  required: boolean;
  isNegative: boolean;
  weight: number;
  position: number;
  options: Array<{ value: string | number | boolean; label: string; score?: number }>;
  scoring: Record<string, any>;
  config: Record<string, any>;
  active: boolean;
};

export type Questionnaire = {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  formType: QuestionnaireFormType;
  companyId?: string | null;
  companyName?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  status: 'draft' | 'active' | 'archived';
  version: number;
  questionCount: number;
  questions?: QuestionnaireQuestion[];
};

export type ResultsCategoryAverage = {
  name: string;
  score: number;
  risk: number;
};

export type ResultsRiskTechnicalFinding = {
  category: string;
  canonicalCategory: string;
  aliases: string[];
  score: number;
  risk: number;
  riskLevel: 'trivial' | 'toleravel' | 'moderado' | 'substancial' | 'intoleravel';
  riskLevelLabel: string;
  configured: boolean;
  purpose: string;
  observedFactors: string[];
  likelySources: string[];
  possibleConsequences: string[];
  recommendedActions: string[];
  followUpIndicators: string[];
  riskMeaning: string;
  evidenceLabels: string[];
  limitations: string[];
};

export type ResultsRiskRecommendation = {
  id: string;
  category: string;
  risk: number;
  riskLevelLabel: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  evidenceLabels: string[];
  rule: string;
  what: string;
  why: string;
  where: string;
  who: string;
  when: string;
  how: string;
  followUpIndicators: string[];
};

export type ResultsSegment = {
  dimension: string;
  dimensionLabel: string;
  value: string;
  count: number;
  share: number;
  categories: ResultsCategoryAverage[];
  topRiskCategory?: ResultsCategoryAverage | null;
};

export type ResultsSegmentation = {
  key: string;
  label: string;
  totalGroups: number;
  visibleGroups: number;
  hiddenGroups: number;
  minEmployeeResponses: number;
  rule: string;
  segments: ResultsSegment[];
};

export type ResultsInstitutionalComparison = {
  category: string;
  employeeScore: number;
  employeeRisk: number;
  companyScore: number;
  companyRisk: number;
  riskDifference: number;
  absDifference: number;
  relevant: boolean;
  direction: 'percepcao_colaboradores_mais_critica' | 'formulario_institucional_mais_critico' | 'alinhado';
  message: string;
};

export type ResultsLlmAnalysis = {
  enabled: boolean;
  status: 'disabled' | 'skipped_privacy_gate' | 'ready_for_provider' | 'rejected' | 'generated';
  provider: string;
  model: string;
  promptVersion: string;
  requiresHumanReview: boolean;
  generatedAt: string;
  source: string;
  inputSummary: {
    categories: number;
    technicalFindings: number;
    actionCandidates: number;
    segmentDimensions: number;
    visibleSegments: number;
    relevantInstitutionalComparisons: number;
    rawAnswersIncluded: boolean;
    rawScoresByPersonIncluded: boolean;
    personalIdentifiersIncluded: boolean;
  };
  schema: {
    name: string;
    requiredTopLevelFields: string[];
    requiredReferences: string[];
  };
  promptPreview: {
    system: string;
    userPayloadKeys: string[];
    outputFormat: string;
  };
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  audit: {
    logMode: string;
    storesRawAnswers: boolean;
    storesPersonalIdentifiers: boolean;
    costCents: number | null;
    providerRequestId: string | null;
  };
  sanitizedPayload?: Record<string, any>;
};

export type ResultsEvidenceQuestion = {
  questionId?: string;
  questionnaireId?: string;
  questionKey?: string;
  text?: string;
  questionText?: string;
  description?: string | null;
  label?: string;
  category?: string;
  type?: QuestionnaireQuestion['type'];
  isNegative?: boolean;
  score?: number;
  averageScore?: number;
  averageAnswer?: number | null;
  risk?: number;
  impact?: number;
  driverScore?: number;
  negativeShare?: number;
  responseCount?: number;
  answeredCount?: number;
  validResponseCount?: number;
  skippedCount?: number;
  invalidAnswerCount?: number;
  count?: number;
  weight?: number;
  answerDistribution?: Record<string, number>;
  scoring?: Record<string, any>;
  legacyAggregate?: boolean;
};

export type ResultsEvidenceCategory = {
  category?: string;
  name?: string;
  score?: number;
  risk?: number;
  questionCount?: number;
  validResponseCount?: number;
  legacyAggregate?: boolean;
  topDrivers?: ResultsEvidenceQuestion[];
  drivers?: ResultsEvidenceQuestion[];
  questions?: ResultsEvidenceQuestion[];
  evidence?: ResultsEvidenceQuestion[];
};

export type ResultsAnalysisPayload =
  | {
      criticalCategories?: ResultsEvidenceCategory[];
      categories?: ResultsEvidenceCategory[];
      evidence?: ResultsEvidenceCategory[] | Record<string, ResultsEvidenceQuestion[]>;
      drivers?: ResultsEvidenceCategory[] | Record<string, ResultsEvidenceQuestion[]>;
      topDrivers?: ResultsEvidenceCategory[] | Record<string, ResultsEvidenceQuestion[]>;
    }
  | ResultsEvidenceCategory[]
  | Record<string, ResultsEvidenceQuestion[]>;

export type ResultsSummary = {
  employeeResponsesCount?: number;
  companyResponseSubmitted?: boolean;
  minimumResponsesMet?: boolean;
  minEmployeeResponses?: number;
  privacy?: {
    minimumResponsesMet: boolean;
    minEmployeeResponses: number;
    employeeCapacity?: number | null;
    smallCompanyMode?: boolean;
    analysisAllowed: boolean;
    reportMode?: 'micro_company' | 'insufficient_sample' | 'collective_analysis';
    message: string;
    nextAction?: string;
  };
  categoryAverages?: ResultsCategoryAverage[];
  analysis?: ResultsAnalysisPayload;
  evidence?: ResultsAnalysisPayload;
  technicalFindings?: ResultsRiskTechnicalFinding[];
  reportRecommendations?: ResultsRiskRecommendation[];
  segmentations?: ResultsSegmentation[];
  institutionalComparison?: ResultsInstitutionalComparison[];
  llmAnalysis?: ResultsLlmAnalysis;
  hasLegacyAggregateEvidence?: boolean;
};

export type ResultsResponse = {
  campaign: any | null;
  responses: any[];
  companyResponses?: any[];
  summary?: ResultsSummary;
  analysis?: ResultsAnalysisPayload;
  evidence?: ResultsAnalysisPayload;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.message || payload.error || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AppUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AppUser }>('/me'),

  listUsers: () => request<{ users: AppUser[] }>('/users'),
  createUser: (data: { name: string; email: string; role: string; password?: string }) =>
    request<{ user: AppUser; temporaryPassword?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteUser: (email: string) => request<{ ok: true }>(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  reportSettings: () =>
    request<{ settings: { publicSalesEnabled: boolean; reportPriceCents: number; maxInstallments: number; minEmployeeResponses: number; updatedAt?: string } }>(
      '/report-settings'
    ),
  updateReportSettings: (data: { publicSalesEnabled: boolean; reportPriceCents: number; maxInstallments: number; minEmployeeResponses: number }) =>
    request<{ settings: { publicSalesEnabled: boolean; reportPriceCents: number; maxInstallments: number; minEmployeeResponses: number; updatedAt?: string } }>(
      '/report-settings',
      { method: 'PATCH', body: JSON.stringify(data) }
    ),

  listQuestionnaires: (params: { formType?: QuestionnaireFormType; companyId?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.formType) search.set('formType', params.formType);
    if (params.companyId) search.set('companyId', params.companyId);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return request<{ questionnaires: Questionnaire[] }>(`/questionnaires${suffix}`);
  },
  questionnaire: (id: string) => request<{ questionnaire: Questionnaire }>(`/questionnaires/${id}`),
  createQuestionnaire: (data: any) =>
    request<{ questionnaire: Questionnaire }>('/questionnaires', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestionnaire: (id: string, data: any) =>
    request<{ questionnaire: Questionnaire }>(`/questionnaires/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createQuestionnaireQuestion: (id: string, data: any) =>
    request<{ questionnaire: Questionnaire; question: QuestionnaireQuestion }>(`/questionnaires/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQuestionnaireQuestion: (id: string, questionId: string, data: any) =>
    request<{ questionnaire: Questionnaire; question: QuestionnaireQuestion }>(`/questionnaires/${id}/questions/${questionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteQuestionnaireQuestion: (id: string, questionId: string) =>
    request<{ ok: true; questionnaire: Questionnaire }>(`/questionnaires/${id}/questions/${questionId}`, { method: 'DELETE' }),

  listCompanies: () => request<{ companies: any[] }>('/companies'),
  createCompany: (data: any) => request<{ company: any }>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: any) =>
    request<{ company: any }>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  listCampaigns: () => request<{ campaigns: any[] }>('/campaigns'),
  createCampaign: (data: any) => request<{ campaign: any }>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCampaign: (id: string) => request<{ ok: true }>(`/campaigns/${id}`, { method: 'DELETE' }),

  dashboardSummary: () =>
    request<{ totalCompanies: number; totalActiveCampaigns: number; totalResponses: number; lastEmployeeResponses: any[] }>(
      '/dashboard/summary'
    ),
  reports: () => request<{ reports: any[] }>('/reports'),
  results: (campaignId: string) => request<ResultsResponse>(`/results/${campaignId}`),
  report: (campaignId: string) => request<{ campaign: any | null; company: any | null; responses: any[]; companyResponses?: any[]; summary?: any }>(`/reports/${campaignId}`),

  publicCompanyForm: (token: string) => request<{ campaign: any; company: any | null; questionnaire: Questionnaire | null }>(`/public/company-form/${token}`),
  submitCompanyResponse: (data: any) =>
    request<{ id: string }>('/public/company-responses', { method: 'POST', body: JSON.stringify(data) }),
  publicEmployeeForm: (token: string) => request<{ campaign: any; company: any | null; questionnaire: Questionnaire | null }>(`/public/employee-form/${token}`),
  submitEmployeeResponse: (data: any) =>
    request<{ id: string }>('/public/employee-responses', { method: 'POST', body: JSON.stringify(data) }),

  createPublicDiagnostic: (data: any) =>
    request<{ diagnostic: any }>('/public/diagnostics', { method: 'POST', body: JSON.stringify(data) }),
  publicDiagnostic: (token: string) => request<{ diagnostic: any }>(`/public/diagnostics/${token}`),
  createPublicCheckout: (token: string) =>
    request<{ paid: boolean; checkoutUrl?: string; reportUrl?: string | null; payment?: any }>(`/public/diagnostics/${token}/checkout`, {
      method: 'POST',
    }),
  publicPaymentStatus: (token: string, paymentId?: string | null) => {
    const search = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : '';
    return request<{ paid: boolean; reportUrl: string | null; payment: any | null }>(`/public/diagnostics/${token}/payment-status${search}`);
  },
};

export function publicReportUrl(token: string) {
  return `${API_URL}/public/diagnostics/${encodeURIComponent(token)}/report.pdf`;
}

export function formatDateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}
