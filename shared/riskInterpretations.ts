export type RiskLevel = 'trivial' | 'toleravel' | 'moderado' | 'substancial' | 'intoleravel';

export type RiskInterpretationTemplate = {
  canonicalCategory: string;
  aliases: string[];
  purpose: string;
  observedFactors: string[];
  likelySources: string[];
  possibleConsequences: string[];
  recommendedActions: string[];
  followUpIndicators: string[];
};

export type RiskTechnicalFinding = RiskInterpretationTemplate & {
  category: string;
  score: number;
  risk: number;
  riskLevel: RiskLevel;
  riskLevelLabel: string;
  configured: boolean;
  riskMeaning: string;
  evidenceLabels: string[];
  limitations: string[];
};

export type CategoryScoreInput = {
  name: string;
  score: number;
  risk: number;
};

export type EvidenceCategoryInput = {
  name?: string;
  category?: string;
  drivers?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
  topDrivers?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
  questions?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
};

const DEFAULT_LIMITATIONS = [
  'A leitura é coletiva e não deve ser interpretada como diagnóstico clínico individual.',
  'Resultados com amostra pequena ou baixa adesão exigem confirmação por responsável técnico.',
  'Perguntas personalizadas precisam manter categoria, peso e regra de pontuação para sustentar a rastreabilidade.',
];

export function normalizeRiskKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getRiskLevel(risk: number): { level: RiskLevel; label: string } {
  if (risk >= 76) return { level: 'intoleravel', label: 'Intolerável' };
  if (risk >= 61) return { level: 'substancial', label: 'Substancial' };
  if (risk >= 41) return { level: 'moderado', label: 'Moderado' };
  if (risk >= 21) return { level: 'toleravel', label: 'Tolerável' };
  return { level: 'trivial', label: 'Trivial' };
}

function readingByLevel(category: string, risk: number, levelLabel: string) {
  if (risk >= 76) {
    return `O resultado indica exposição psicossocial ${levelLabel.toLowerCase()} em ${category}. Recomenda-se ação prioritária, confirmação técnica dos fatores envolvidos e acompanhamento de curto prazo.`;
  }
  if (risk >= 61) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}, com sinais relevantes de fragilidade organizacional. A categoria deve entrar no plano de ação com responsáveis, prazo e indicadores.`;
  }
  if (risk >= 41) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Há evidências suficientes para ação preventiva e monitoramento, especialmente nos fatores que mais puxaram o risco.`;
  }
  if (risk >= 21) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Recomenda-se manter práticas existentes e observar tendência nas próximas medições.`;
  }
  return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Não há sinal coletivo relevante no momento, mas a categoria deve continuar em monitoramento periódico.`;
}

const TEMPLATES: RiskInterpretationTemplate[] = [
  {
    canonicalCategory: 'Assédio de qualquer natureza',
    aliases: ['assedio de qualquer natureza', 'assedio moral', 'assedio sexual', 'assedio organizacional', 'humilhacao', 'constrangimento'],
    purpose: 'Avaliar exposição coletiva a condutas repetitivas de humilhação, constrangimento, ameaça, assédio moral, sexual ou organizacional e a confiança nos canais de relato.',
    observedFactors: ['humilhação', 'constrangimento', 'assédio sexual', 'assédio organizacional', 'cobrança abusiva', 'segurança para relatar'],
    likelySources: ['tolerância a condutas inadequadas', 'canal de relato pouco confiável', 'cobrança abusiva', 'lideranças despreparadas', 'medo de retaliação'],
    possibleConsequences: ['silenciamento de relatos', 'agravamento de conflitos', 'afastamentos', 'rotatividade', 'perda de confiança institucional'],
    recommendedActions: ['formalizar canal confidencial', 'divulgar protocolo de apuração', 'treinar lideranças e RH', 'proteger contra retaliação', 'acompanhar reincidências'],
    followUpIndicators: ['uso do canal de relato', 'tempo de apuração', 'reincidência por área', 'afastamentos relacionados', 'percepção de segurança para relatar'],
  },
  {
    canonicalCategory: 'Má gestão de mudanças organizacionais',
    aliases: ['ma gestao de mudancas organizacionais', 'mudancas organizacionais', 'gestao de mudancas', 'mudancas mal conduzidas'],
    purpose: 'Avaliar se mudanças de processo, equipe, prioridade ou estrutura são comunicadas, explicadas e apoiadas de forma organizada.',
    observedFactors: ['comunicação prévia', 'clareza de motivos e impactos', 'apoio em transições', 'participação', 'orientação durante mudanças'],
    likelySources: ['mudanças sem planejamento', 'comunicação tardia', 'baixa participação das equipes', 'falta de orientação', 'prioridades instáveis'],
    possibleConsequences: ['insegurança', 'resistência', 'retrabalho', 'queda de confiança', 'ansiedade sobre prioridades'],
    recommendedActions: ['padronizar comunicação de mudanças', 'explicar impactos por equipe', 'abrir canal de dúvidas', 'preparar lideranças para transições', 'acompanhar adesão aos novos processos'],
    followUpIndicators: ['dúvidas sobre mudanças', 'retrabalho após implantação', 'adesão a novos processos', 'chamados de suporte', 'percepção de clareza'],
  },
  {
    canonicalCategory: 'Baixa clareza de papel ou função',
    aliases: ['baixa clareza de papel', 'baixa clareza de funcao', 'clareza de papel', 'clareza de funcao', 'desvio de funcao'],
    purpose: 'Avaliar se as pessoas compreendem expectativas, responsabilidades, prioridades e limites da própria função.',
    observedFactors: ['expectativas claras', 'responsabilidades', 'prioridades', 'limites de atuação', 'cobranças fora da função'],
    likelySources: ['descrições de função desatualizadas', 'comunicação insuficiente', 'prioridades conflitantes', 'delegação pouco clara', 'desvios de função'],
    possibleConsequences: ['insegurança operacional', 'retrabalho', 'conflitos de responsabilidade', 'baixa eficiência', 'tensão com lideranças'],
    recommendedActions: ['revisar descrições de função', 'formalizar responsabilidades', 'registrar prioridades por equipe', 'criar rituais de alinhamento', 'acompanhar desvios de função'],
    followUpIndicators: ['retrabalho', 'dúvidas recorrentes', 'conflitos de responsabilidade', 'mudanças emergenciais de prioridade', 'queixas sobre desvio de função'],
  },
  {
    canonicalCategory: 'Baixas recompensas e reconhecimento',
    aliases: ['baixas recompensas', 'recompensas e reconhecimento', 'reconhecimento', 'valorizacao', 'feedback positivo'],
    purpose: 'Avaliar percepção de valorização, reconhecimento, feedback positivo, equilíbrio entre cobrança e recompensa e oportunidades de desenvolvimento.',
    observedFactors: ['reconhecimento', 'feedback positivo', 'equilíbrio cobrança-valorização', 'oportunidades de crescimento', 'desenvolvimento'],
    likelySources: ['feedback raro', 'critérios pouco transparentes', 'baixa valorização simbólica', 'oportunidades restritas', 'cobrança sem retorno'],
    possibleConsequences: ['desmotivação', 'queda de engajamento', 'cinismo organizacional', 'intenção de saída', 'perda de confiança'],
    recommendedActions: ['definir práticas de reconhecimento', 'estruturar feedbacks regulares', 'dar transparência a oportunidades', 'acompanhar percepção de valorização', 'equilibrar cobrança e devolutivas'],
    followUpIndicators: ['feedbacks registrados', 'percepção de reconhecimento', 'participação em desenvolvimento', 'turnover voluntário', 'engajamento por equipe'],
  },
  {
    canonicalCategory: 'Falta de suporte ou apoio no trabalho',
    aliases: ['falta de suporte', 'falta de apoio', 'apoio no trabalho', 'suporte da lideranca', 'apoio de colegas'],
    purpose: 'Avaliar disponibilidade de apoio da liderança, colegas, orientação, recursos, ferramentas e informações para executar o trabalho.',
    observedFactors: ['apoio da liderança', 'cooperação entre colegas', 'orientação', 'recursos e ferramentas', 'informações para execução'],
    likelySources: ['liderança indisponível', 'cooperação frágil', 'treinamento insuficiente', 'recursos inadequados', 'fluxos de suporte pouco claros'],
    possibleConsequences: ['isolamento', 'erros operacionais', 'retração para pedir ajuda', 'sobrecarga individual', 'queda de produtividade'],
    recommendedActions: ['definir fluxo de apoio', 'capacitar lideranças para escuta e orientação', 'mapear recursos críticos', 'estimular cooperação', 'monitorar dúvidas recorrentes'],
    followUpIndicators: ['chamados de suporte', 'dúvidas recorrentes', 'tempo de resposta da liderança', 'retrabalho', 'percepção de cooperação'],
  },
  {
    canonicalCategory: 'Baixo controle no trabalho ou falta de autonomia',
    aliases: ['baixo controle no trabalho', 'falta de autonomia', 'autonomia', 'controle no trabalho', 'tomada de decisao'],
    purpose: 'Avaliar se as pessoas têm autonomia proporcional ao cargo para organizar a rotina, decidir sobre a execução e influenciar melhorias do próprio trabalho.',
    observedFactors: ['autonomia decisória', 'organização da rotina', 'influência sobre prioridades', 'sugestões consideradas', 'participação em decisões'],
    likelySources: ['microgestão', 'processos decisórios centralizados', 'prioridades rígidas', 'baixa escuta operacional', 'pouca margem de adaptação'],
    possibleConsequences: ['baixa eficiência', 'frustração', 'retração de sugestões', 'dependência excessiva da liderança', 'perda de senso de controle'],
    recommendedActions: ['definir limites de autonomia por função', 'criar canais de melhoria operacional', 'treinar lideranças em delegação', 'revisar fluxos decisórios', 'acompanhar sugestões implementadas'],
    followUpIndicators: ['sugestões recebidas', 'tempo de decisão', 'retrabalho por aprovação', 'percepção de autonomia', 'demandas escalonadas'],
  },
  {
    canonicalCategory: 'Eventos violentos ou traumáticos',
    aliases: ['eventos violentos', 'eventos traumaticos', 'violencia', 'ameacas', 'agressoes', 'perigo grave'],
    purpose: 'Avaliar exposição a ameaças, agressões, situações de perigo, acidentes ou eventos traumáticos e o suporte oferecido após ocorrências graves.',
    observedFactors: ['ameaças', 'agressões', 'situações de perigo', 'eventos traumáticos', 'acolhimento pós-ocorrência', 'medidas de proteção'],
    likelySources: ['atendimento a público hostil', 'ambientes com risco de violência', 'falhas de segurança', 'protocolos insuficientes', 'ausência de acolhimento após incidentes'],
    possibleConsequences: ['medo recorrente', 'afastamentos', 'hipervigilância', 'queda de concentração', 'redução da confiança institucional'],
    recommendedActions: ['mapear cenários de violência', 'revisar protocolos de segurança', 'definir fluxo de acolhimento', 'treinar resposta a incidentes', 'acompanhar reincidências'],
    followUpIndicators: ['incidentes registrados', 'quase acidentes', 'acionamentos de segurança', 'afastamentos relacionados', 'tempo de resposta pós-ocorrência'],
  },
  {
    canonicalCategory: 'Baixa justiça organizacional',
    aliases: ['baixa justica organizacional', 'justica organizacional', 'equidade', 'imparcialidade', 'criterios transparentes'],
    purpose: 'Avaliar percepção de equidade e imparcialidade em regras, distribuição de tarefas, oportunidades, conflitos e punições.',
    observedFactors: ['regras justas', 'distribuição de tarefas', 'critérios de promoção', 'tratamento de conflitos', 'imparcialidade em punições'],
    likelySources: ['critérios pouco transparentes', 'favoritismo percebido', 'tarefas mal distribuídas', 'punições inconsistentes', 'baixa comunicação de decisões'],
    possibleConsequences: ['conflitos sobre equidade', 'desmotivação', 'perda de confiança', 'queixas ao RH', 'maior intenção de saída'],
    recommendedActions: ['dar transparência a critérios', 'revisar distribuição de tarefas', 'padronizar tratamento de conflitos', 'comunicar decisões', 'monitorar percepção de justiça por área'],
    followUpIndicators: ['queixas sobre justiça', 'distribuição de tarefas', 'promoções e oportunidades', 'conflitos formais', 'percepção de imparcialidade'],
  },
  {
    canonicalCategory: 'Conflito de valores no trabalho',
    aliases: ['conflito de valores', 'valores no trabalho', 'conflito etico', 'principios eticos', 'condutas inadequadas'],
    purpose: 'Avaliar situações em que trabalhadores percebem pressão para agir contra princípios éticos ou morais, incoerência institucional ou insegurança para questionar condutas inadequadas.',
    observedFactors: ['pressão contra princípios', 'conflito ético', 'coerência entre discurso e prática', 'segurança para questionar', 'recusa de condutas inadequadas'],
    likelySources: ['metas incompatíveis com valores declarados', 'tolerância a atalhos antiéticos', 'pressão hierárquica', 'medo de retaliação', 'cultura pouco transparente'],
    possibleConsequences: ['sofrimento moral', 'queda de confiança', 'desengajamento', 'conflitos com liderança', 'risco reputacional'],
    recommendedActions: ['reforçar código de conduta', 'abrir canal seguro para dilemas éticos', 'revisar metas e incentivos', 'treinar lideranças', 'proteger questionamentos de boa-fé'],
    followUpIndicators: ['relatos éticos', 'uso de canal de conduta', 'percepção de coerência', 'revisão de metas', 'queixas sobre pressão indevida'],
  },
  {
    canonicalCategory: 'Conflitos interpessoais',
    aliases: ['conflitos interpessoais', 'relacoes interpessoais', 'tensoes recorrentes', 'conflitos com colegas', 'conflitos com clientes'],
    purpose: 'Avaliar tensões recorrentes e qualidade das relações com colegas, lideranças, clientes e setores, incluindo cooperação e mediação de conflitos.',
    observedFactors: ['tensões recorrentes', 'respeito entre pessoas', 'mediação pela liderança', 'cooperação', 'respeito entre setores'],
    likelySources: ['normas de convivência frágeis', 'conflitos acumulados', 'falhas de comunicação', 'competição interna excessiva', 'liderança pouco mediadora'],
    possibleConsequences: ['isolamento', 'queda de cooperação', 'comunicação defensiva', 'retrabalho entre áreas', 'redução da segurança psicológica'],
    recommendedActions: ['reforçar acordos de convivência', 'mediar conflitos recorrentes', 'treinar comunicação respeitosa', 'acompanhar áreas com maior tensão', 'definir fluxo para tratar comportamentos inadequados'],
    followUpIndicators: ['relatos de conflito', 'cooperação entre áreas', 'queixas formais e informais', 'retrabalho entre setores', 'adesão a mediações'],
  },
  {
    canonicalCategory: 'Jornada de trabalho inadequada ou extensiva',
    aliases: ['jornada inadequada', 'jornada extensiva', 'horas extras', 'pausas', 'descanso', 'equilibrio trabalho vida'],
    purpose: 'Avaliar adequação da jornada, frequência de horas extras, pausas, recuperação após o trabalho e equilíbrio entre trabalho e vida pessoal.',
    observedFactors: ['horas extras', 'pausas', 'descanso pós-jornada', 'equilíbrio vida-trabalho', 'recuperação'],
    likelySources: ['dimensionamento insuficiente', 'escalas inadequadas', 'pausas não praticadas', 'fronteiras trabalho-vida frágeis', 'picos de demanda permanentes'],
    possibleConsequences: ['fadiga', 'dificuldade de recuperação', 'queda de atenção', 'absenteísmo', 'conflitos trabalho-família'],
    recommendedActions: ['revisar escalas e horas extras', 'organizar pausas', 'monitorar recuperação pós-jornada', 'ajustar dimensionamento', 'acompanhar equilíbrio trabalho-vida'],
    followUpIndicators: ['horas extras', 'pausas registradas', 'absenteísmo', 'relatos de fadiga', 'percepção de equilíbrio'],
  },
  {
    canonicalCategory: 'Alta demanda de trabalho ou sobrecarga psicológica',
    aliases: ['alta demanda de trabalho', 'sobrecarga psicologica', 'sobrecarga', 'ritmo acelerado', 'metas inatingiveis'],
    purpose: 'Avaliar excesso de volume, ritmo acelerado, pressão de tempo, metas e apoio em picos de demanda.',
    observedFactors: ['volume de trabalho', 'ritmo acelerado', 'pressão de tempo', 'metas realistas', 'apoio em picos de demanda'],
    likelySources: ['subdimensionamento de equipe', 'metas pouco realistas', 'picos sem reforço', 'gargalos de processo', 'prioridades conflitantes'],
    possibleConsequences: ['fadiga', 'queda de atenção', 'retrabalho', 'absenteísmo', 'conflitos por pressão operacional'],
    recommendedActions: ['revisar dimensionamento e metas', 'priorizar demandas', 'mapear gargalos', 'definir apoio para picos', 'monitorar backlog e horas extras'],
    followUpIndicators: ['backlog', 'horas extras', 'retrabalho', 'absenteísmo', 'cumprimento de metas'],
  },
  {
    canonicalCategory: 'Baixa demanda de trabalho ou subcarga',
    aliases: ['baixa demanda de trabalho', 'subcarga', 'tedio', 'ociosidade', 'subutilizacao'],
    purpose: 'Avaliar ausência de tarefas suficientes, tédio constante, tempo ocioso e subutilização das capacidades do trabalhador.',
    observedFactors: ['falta de tarefas', 'tédio', 'subutilização de capacidades', 'tempo ocioso', 'engajamento'],
    likelySources: ['má alocação de trabalho', 'processos com baixa demanda', 'função mal desenhada', 'competências subutilizadas', 'planejamento insuficiente'],
    possibleConsequences: ['desengajamento', 'perda de sentido no trabalho', 'queda de atenção', 'rotatividade', 'baixa produtividade percebida'],
    recommendedActions: ['revisar desenho da função', 'redistribuir atividades', 'aproveitar competências disponíveis', 'definir metas compatíveis', 'oferecer desenvolvimento ou rotação de tarefas'],
    followUpIndicators: ['tempo ocioso', 'adesão a novas atividades', 'percepção de desafio', 'produtividade por função', 'turnover voluntário'],
  },
  {
    canonicalCategory: 'Sobrecarga e ritmo',
    aliases: ['sobrecarga', 'ritmo', 'carga', 'demanda', 'pressao', 'horas extras', 'metas'],
    purpose: 'Avaliar se a demanda, o ritmo, as metas, as pausas e os recursos disponíveis estão compatíveis com a jornada e com a capacidade operacional da equipe.',
    observedFactors: ['volume de trabalho', 'pressão de tempo', 'pausas', 'horas extras', 'distribuição de demandas', 'apoio em picos de trabalho'],
    likelySources: ['subdimensionamento de equipe', 'metas pouco realistas', 'picos de demanda sem reforço', 'gargalos de processo', 'prioridades conflitantes'],
    possibleConsequences: ['fadiga', 'queda de atenção', 'retrabalho', 'absenteísmo', 'conflitos por pressão operacional', 'dificuldade de recuperação após a jornada'],
    recommendedActions: ['revisar dimensionamento e escalas', 'reavaliar metas e prazos', 'organizar pausas e micro-pausas', 'mapear gargalos do processo', 'monitorar horas extras por 90 dias'],
    followUpIndicators: ['horas extras', 'absenteísmo', 'retrabalho', 'fila/backlog operacional', 'turnover por setor'],
  },
  {
    canonicalCategory: 'Clareza e autonomia',
    aliases: ['clareza', 'autonomia', 'papel', 'responsabilidade', 'orientacao', 'prioridade'],
    purpose: 'Avaliar se as pessoas compreendem responsabilidades, prioridades, limites de atuação e grau de autonomia para executar o trabalho.',
    observedFactors: ['clareza de papéis', 'orientação para execução', 'autonomia', 'mudanças de prioridade', 'cobranças fora da função'],
    likelySources: ['papéis mal definidos', 'comunicação insuficiente', 'mudanças sem alinhamento', 'microgestão', 'processos decisórios pouco claros'],
    possibleConsequences: ['insegurança operacional', 'retrabalho', 'conflitos de responsabilidade', 'baixa eficiência', 'aumento de tensão com lideranças'],
    recommendedActions: ['revisar descrições de função', 'formalizar prioridades por equipe', 'criar rituais de alinhamento', 'treinar lideranças para delegação clara', 'definir critérios de autonomia'],
    followUpIndicators: ['retrabalho', 'mudanças emergenciais de prioridade', 'dúvidas recorrentes', 'tempo de resposta da liderança', 'conflitos de responsabilidade'],
  },
  {
    canonicalCategory: 'Liderança e gestão',
    aliases: ['lideranca', 'gestao', 'lider', 'feedback', 'cobranca'],
    purpose: 'Avaliar a qualidade da condução da liderança, incluindo respeito, escuta, feedback, orientação, resolução de conflitos e equilíbrio na cobrança por resultados.',
    observedFactors: ['respeito da liderança', 'escuta', 'feedback', 'orientação após erros', 'cobrança equilibrada', 'tratamento de conflitos'],
    likelySources: ['baixa preparação de lideranças', 'cobrança sem apoio', 'feedback inadequado', 'ausência de rotina de escuta', 'conflitos não mediados'],
    possibleConsequences: ['perda de confiança', 'conflitos interpessoais', 'medo de relatar dificuldades', 'baixa cooperação', 'rotatividade'],
    recommendedActions: ['capacitar lideranças em gestão psicossocial', 'implantar rotina de feedback respeitoso', 'criar canal de escuta com devolutiva', 'acompanhar conflitos críticos', 'definir padrão de conduta de liderança'],
    followUpIndicators: ['turnover por liderança', 'queixas ao RH', 'clima por equipe', 'adesão a feedbacks', 'resolução de conflitos'],
  },
  {
    canonicalCategory: 'Relações interpessoais',
    aliases: ['relacoes', 'interpessoais', 'colegas', 'conflitos', 'cooperacao', 'dignidade'],
    purpose: 'Avaliar a qualidade das relações entre colegas e setores, incluindo cooperação, respeito, dignidade e tratamento justo de conflitos.',
    observedFactors: ['respeito entre colegas', 'cooperação', 'conflitos', 'brincadeiras ofensivas', 'dignidade', 'respeito entre setores'],
    likelySources: ['normas de convivência frágeis', 'conflitos acumulados', 'competição interna excessiva', 'falhas de comunicação entre áreas', 'tolerância a comportamentos inadequados'],
    possibleConsequences: ['isolamento', 'queda de cooperação', 'aumento de conflitos', 'comunicação defensiva', 'redução da segurança psicológica'],
    recommendedActions: ['reforçar acordos de convivência', 'mediar conflitos recorrentes', 'treinar equipes em comunicação respeitosa', 'acompanhar áreas com maior tensão', 'definir fluxo para tratar comportamentos inadequados'],
    followUpIndicators: ['relatos de conflito', 'cooperação entre áreas', 'queixas formais e informais', 'retrabalho entre setores', 'adesão a mediações'],
  },
  {
    canonicalCategory: 'Assédio e violência',
    aliases: ['assedio', 'violencia', 'humilhacao', 'discriminacao', 'desrespeito', 'canal de relato'],
    purpose: 'Avaliar sinais coletivos de exposição a humilhação, discriminação, desrespeito, violência psicológica e segurança para relatar situações graves.',
    observedFactors: ['humilhação', 'gritos', 'constrangimento', 'discriminação', 'segurança para relatar', 'conhecimento de canais'],
    likelySources: ['canal de relato pouco confiável', 'ausência de protocolo de apuração', 'tolerância a condutas inadequadas', 'lideranças despreparadas', 'medo de retaliação'],
    possibleConsequences: ['silenciamento de relatos', 'agravamento de conflitos', 'afastamentos', 'rotatividade', 'perda de confiança institucional'],
    recommendedActions: ['formalizar canal confidencial', 'divulgar protocolo de apuração', 'treinar lideranças e RH', 'proteger contra retaliação', 'acompanhar reincidências'],
    followUpIndicators: ['uso do canal de relato', 'tempo de apuração', 'reincidência por área', 'afastamentos relacionados', 'percepção de segurança para relatar'],
  },
  {
    canonicalCategory: 'Reconhecimento e justiça',
    aliases: ['reconhecimento', 'justica', 'equidade', 'regras', 'crescimento', 'desenvolvimento'],
    purpose: 'Avaliar percepção de reconhecimento, justiça, comunicação de decisões, oportunidade de participação e equilíbrio entre cobrança e valorização.',
    observedFactors: ['reconhecimento', 'justiça nas regras', 'comunicação de decisões', 'participação', 'crescimento', 'equilíbrio cobrança-reconhecimento'],
    likelySources: ['critérios pouco transparentes', 'feedback raro', 'decisões sem comunicação', 'baixa participação em melhorias', 'percepção de favoritismo'],
    possibleConsequences: ['desmotivação', 'cinismo organizacional', 'queda de engajamento', 'conflitos sobre equidade', 'maior intenção de saída'],
    recommendedActions: ['definir critérios de reconhecimento', 'dar transparência a regras e decisões', 'criar canais de sugestão', 'acompanhar percepção de justiça por área', 'integrar desenvolvimento ao plano de gestão'],
    followUpIndicators: ['participação em sugestões', 'percepção de justiça', 'promoções e oportunidades', 'feedbacks registrados', 'turnover voluntário'],
  },
  {
    canonicalCategory: 'Bem-estar',
    aliases: ['bem estar', 'saude', 'estresse', 'sono', 'descanso', 'vida pessoal', 'equilibrio'],
    purpose: 'Avaliar sinais coletivos de desgaste relacionado ao trabalho e presença de fatores protetivos para recuperação, equilíbrio e bem-estar.',
    observedFactors: ['estresse relacionado ao trabalho', 'sono e descanso', 'equilíbrio vida-trabalho', 'condição ao final da jornada', 'segurança para falar sobre dificuldades'],
    likelySources: ['exigências emocionais elevadas', 'dificuldade de recuperação', 'sobrecarga sustentada', 'baixo apoio', 'ambiente com tensão recorrente'],
    possibleConsequences: ['fadiga', 'queda de concentração', 'absenteísmo', 'presenteísmo', 'maior procura por apoio', 'intenção de saída'],
    recommendedActions: ['implantar rotina de escuta coletiva', 'monitorar sinais de fadiga', 'revisar fatores de estresse por setor', 'orientar lideranças para acolhimento', 'encaminhar casos individuais pelos fluxos adequados sem exposição'],
    followUpIndicators: ['absenteísmo', 'presenteísmo', 'relatos de fadiga', 'adesão a ações de apoio', 'reavaliação do score em 90 dias'],
  },
  {
    canonicalCategory: 'Recursos e Processos',
    aliases: ['recursos', 'processos', 'ferramentas', 'informacoes', 'comunicacao', 'mudancas'],
    purpose: 'Avaliar se comunicação, recursos, ferramentas, ambiente físico e processos sustentam a execução segura e organizada do trabalho.',
    observedFactors: ['comunicação interna', 'recursos e ferramentas', 'ambiente físico', 'processos de trabalho', 'prevenção de conflitos', 'gestão de mudanças'],
    likelySources: ['ferramentas insuficientes', 'processos instáveis', 'comunicação fragmentada', 'mudanças sem planejamento', 'falta de informação para executar tarefas'],
    possibleConsequences: ['retrabalho', 'frustração operacional', 'queda de produtividade', 'conflitos entre áreas', 'aumento de pressão sobre lideranças'],
    recommendedActions: ['mapear recursos críticos', 'revisar fluxos de trabalho', 'melhorar comunicação de mudanças', 'corrigir gargalos de ferramentas', 'acompanhar incidentes de processo'],
    followUpIndicators: ['chamados de suporte', 'retrabalho', 'tempo de ciclo', 'falhas de comunicação', 'adesão a novos processos'],
  },
];

const FALLBACK_TEMPLATE: RiskInterpretationTemplate = {
  canonicalCategory: 'Categoria personalizada',
  aliases: [],
  purpose: 'Avaliar fator psicossocial configurado no questionário personalizado da campanha.',
  observedFactors: ['fator configurado no questionário', 'respostas agregadas', 'peso e regra de pontuação definidos pela metodologia'],
  likelySources: ['fonte organizacional a confirmar pelo responsável técnico', 'processos ou práticas de gestão relacionados à categoria', 'condições de trabalho associadas ao fator avaliado'],
  possibleConsequences: ['efeitos coletivos a confirmar tecnicamente', 'queda de engajamento', 'tensão organizacional', 'necessidade de investigação complementar'],
  recommendedActions: ['validar a categoria com responsável técnico', 'revisar perguntas e pesos configurados', 'cruzar o achado com indicadores internos', 'definir ação preventiva compatível com o fator avaliado'],
  followUpIndicators: ['novo score da categoria', 'adesão à ação preventiva', 'indicadores internos definidos pela empresa', 'comentários agregados sem identificação individual'],
};

function templateForCategory(categoryName: string) {
  const normalized = normalizeRiskKey(categoryName);
  const canonicalTemplate = TEMPLATES.find((item) => {
    const canonical = normalizeRiskKey(item.canonicalCategory);
    return normalized.includes(canonical) || canonical.includes(normalized);
  });
  const template = canonicalTemplate || TEMPLATES.find((item) => {
    return item.aliases.some((alias) => normalized.includes(normalizeRiskKey(alias)));
  });

  if (template) return { template, configured: true };

  return {
    template: {
      ...FALLBACK_TEMPLATE,
      canonicalCategory: categoryName,
    },
    configured: false,
  };
}

function evidenceName(driver: any) {
  return String(driver?.label || driver?.questionText || driver?.text || driver?.questionKey || '').trim();
}

function evidenceForCategory(categoryName: string, evidenceCategories: EvidenceCategoryInput[] = []) {
  const key = normalizeRiskKey(categoryName);
  const evidence = evidenceCategories.find((item) => normalizeRiskKey(String(item.name || item.category || '')) === key);
  const drivers = evidence?.drivers || evidence?.topDrivers || evidence?.questions || [];
  return drivers.map(evidenceName).filter(Boolean).slice(0, 3);
}

export function buildRiskTechnicalFindings(
  categories: CategoryScoreInput[] = [],
  evidenceCategories: EvidenceCategoryInput[] = []
): RiskTechnicalFinding[] {
  return categories.map((category) => {
    const { template, configured } = templateForCategory(category.name);
    const { level, label } = getRiskLevel(category.risk);

    return {
      ...template,
      category: category.name,
      score: category.score,
      risk: category.risk,
      riskLevel: level,
      riskLevelLabel: label,
      configured,
      riskMeaning: readingByLevel(category.name, category.risk, label),
      evidenceLabels: evidenceForCategory(category.name, evidenceCategories),
      limitations: configured
        ? DEFAULT_LIMITATIONS
        : [
            'Categoria personalizada sem biblioteca técnica específica. A leitura abaixo é genérica e exige validação do responsável técnico.',
            ...DEFAULT_LIMITATIONS,
          ],
    };
  });
}
