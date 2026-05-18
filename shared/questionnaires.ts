export type QuestionnaireFormType = 'company' | 'employee';

export type QuestionnaireQuestionType =
  | 'scale'
  | 'frequency'
  | 'text'
  | 'textarea'
  | 'select'
  | 'single_choice'
  | 'number'
  | 'email'
  | 'checkbox';

export type QuestionnaireOption = {
  value: string | number | boolean;
  label: string;
  score?: number;
};

export type QuestionnaireQuestionSeed = {
  questionKey: string;
  text: string;
  description?: string;
  category: string;
  type: QuestionnaireQuestionType;
  required?: boolean;
  isNegative?: boolean;
  weight?: number;
  position?: number;
  options?: QuestionnaireOption[];
  scoring?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

export type QuestionnaireSeed = {
  slug: string;
  name: string;
  description: string;
  formType: QuestionnaireFormType;
  questions: QuestionnaireQuestionSeed[];
};

export const SCALE_OPTIONS: QuestionnaireOption[] = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo parcialmente' },
  { value: 3, label: 'Nem concordo, nem discordo' },
  { value: 4, label: 'Concordo parcialmente' },
  { value: 5, label: 'Concordo totalmente' },
  { value: 6, label: 'Não se aplica' },
];

export const FREQUENCY_OPTIONS: QuestionnaireOption[] = [
  { value: 1, label: 'Nunca' },
  { value: 2, label: 'Raramente' },
  { value: 3, label: 'Às vezes' },
  { value: 4, label: 'Frequentemente' },
  { value: 5, label: 'Sempre' },
  { value: 6, label: 'Prefiro não responder' },
];

const employee = (
  position: number,
  text: string,
  category: string,
  type: QuestionnaireQuestionType = 'scale',
  isNegative = false
): QuestionnaireQuestionSeed => ({
  questionKey: `q${position}`,
  text,
  category,
  type,
  isNegative,
  required: true,
  position,
  options: type === 'frequency' ? FREQUENCY_OPTIONS : SCALE_OPTIONS,
});

export const DEFAULT_EMPLOYEE_QUESTIONS: QuestionnaireQuestionSeed[] = [
  employee(1, 'Minha carga de trabalho é adequada para minha jornada.', 'Sobrecarga e ritmo'),
  employee(2, 'Consigo realizar minhas atividades sem pressão excessiva de tempo.', 'Sobrecarga e ritmo'),
  employee(3, 'Tenho pausas suficientes durante o trabalho.', 'Sobrecarga e ritmo'),
  employee(4, 'Consigo finalizar minhas tarefas sem precisar fazer horas extras com frequência.', 'Sobrecarga e ritmo'),
  employee(5, 'O volume de trabalho é bem distribuído entre as pessoas da equipe.', 'Sobrecarga e ritmo'),
  employee(6, 'As metas ou cobranças do meu trabalho são realistas.', 'Sobrecarga e ritmo'),
  employee(7, 'Quando há aumento de demanda, recebo apoio suficiente da liderança ou da equipe.', 'Sobrecarga e ritmo'),
  employee(8, 'Sei exatamente o que é esperado de mim no trabalho.', 'Clareza e autonomia'),
  employee(9, 'Minhas responsabilidades são claras.', 'Clareza e autonomia'),
  employee(10, 'Recebo orientações suficientes para executar minhas atividades.', 'Clareza e autonomia'),
  employee(11, 'Tenho autonomia adequada para realizar meu trabalho.', 'Clareza e autonomia'),
  employee(12, 'As mudanças de prioridade são comunicadas com clareza.', 'Clareza e autonomia'),
  employee(13, 'Raramente sou cobrado por tarefas que não fazem parte da minha função.', 'Clareza e autonomia'),
  employee(14, 'Meu líder trata as pessoas com respeito.', 'Liderança e gestão'),
  employee(15, 'Meu líder escuta dúvidas, dificuldades ou sugestões.', 'Liderança e gestão'),
  employee(16, 'Recebo feedback de forma respeitosa.', 'Liderança e gestão'),
  employee(17, 'Quando erro, sou orientado de forma adequada, sem humilhação ou exposição.', 'Liderança e gestão'),
  employee(18, 'A cobrança por resultado é feita de forma equilibrada.', 'Liderança e gestão'),
  employee(19, 'Sinto que posso conversar com meu líder sobre dificuldades no trabalho.', 'Liderança e gestão'),
  employee(20, 'A liderança age para resolver conflitos na equipe.', 'Liderança e gestão'),
  employee(21, 'O ambiente entre colegas é respeitoso.', 'Relações interpessoais'),
  employee(22, 'Existe cooperação entre as pessoas da equipe.', 'Relações interpessoais'),
  employee(23, 'Os conflitos são tratados de forma justa.', 'Relações interpessoais'),
  employee(24, 'Não presencio brincadeiras ofensivas, humilhações ou comentários desrespeitosos.', 'Relações interpessoais'),
  employee(25, 'Sinto que sou tratado com dignidade no trabalho.', 'Relações interpessoais'),
  employee(26, 'Existe respeito entre setores diferentes.', 'Relações interpessoais'),
  employee(27, 'Já presenciei situações de humilhação, gritos, constrangimento ou exposição no ambiente de trabalho.', 'Assédio e violência', 'frequency', true),
  employee(28, 'Já sofri tratamento desrespeitoso, ofensivo ou humilhante no trabalho.', 'Assédio e violência', 'frequency', true),
  employee(29, 'Já presenciei ou sofri discriminação por gênero, idade, raça/cor, religião, deficiência, orientação sexual, aparência, origem ou outra condição pessoal.', 'Assédio e violência', 'frequency', true),
  employee(30, 'Sinto segurança para relatar situações de assédio, discriminação ou desrespeito.', 'Assédio e violência'),
  employee(31, 'Sei qual canal procurar caso sofra ou presencie uma situação grave no trabalho.', 'Assédio e violência'),
  employee(32, 'Sinto que meu trabalho é reconhecido.', 'Reconhecimento e justiça'),
  employee(33, 'As decisões que afetam meu trabalho são comunicadas de forma clara.', 'Reconhecimento e justiça'),
  employee(34, 'Tenho oportunidade de dar sugestões de melhoria.', 'Reconhecimento e justiça'),
  employee(35, 'As regras da empresa são aplicadas de forma justa.', 'Reconhecimento e justiça'),
  employee(36, 'Existe equilíbrio entre cobrança e reconhecimento.', 'Reconhecimento e justiça'),
  employee(37, 'Sinto que tenho oportunidade de crescimento ou desenvolvimento.', 'Reconhecimento e justiça'),
  employee(38, 'Sinto-me seguro para falar sobre dificuldades relacionadas ao trabalho.', 'Bem-estar'),
  employee(39, 'O trabalho não tem prejudicado meu sono, descanso ou vida pessoal.', 'Bem-estar'),
  employee(40, 'Ao final da jornada, normalmente me sinto em condições adequadas para descansar.', 'Bem-estar'),
  employee(41, 'Tenho conseguido manter equilíbrio entre trabalho e vida pessoal.', 'Bem-estar'),
  employee(42, 'Sinto que o ambiente de trabalho favorece minha saúde e bem-estar.', 'Bem-estar'),
  employee(43, 'Nos últimos meses, senti aumento de estresse relacionado ao trabalho.', 'Bem-estar', 'frequency', true),
  employee(44, 'Nos últimos meses, pensei em faltar ou sair da empresa por causa do ambiente de trabalho.', 'Bem-estar', 'frequency', true),
  employee(45, 'A comunicação interna da empresa é clara.', 'Recursos e Processos'),
  employee(46, 'Tenho recursos, ferramentas e informações suficientes para fazer meu trabalho.', 'Recursos e Processos'),
  employee(47, 'O ambiente físico contribui para trabalhar bem.', 'Recursos e Processos'),
  employee(48, 'O sistema, processo ou forma de trabalho facilita a execução das atividades.', 'Recursos e Processos'),
  employee(49, 'A empresa se preocupa em prevenir conflitos, sobrecarga e problemas de relacionamento.', 'Recursos e Processos'),
  employee(50, 'Sinto que as mudanças na empresa são conduzidas de forma organizada.', 'Recursos e Processos'),
  {
    questionKey: 'suggestions',
    text: 'O que poderia melhorar no ambiente de trabalho?',
    category: 'Percepção final',
    type: 'textarea',
    required: false,
    position: 51,
  },
  {
    questionKey: 'healthScore',
    text: 'Em uma escala de 0 a 10, o quanto o ambiente é saudável?',
    category: 'Bem-estar',
    type: 'number',
    required: false,
    position: 52,
    scoring: { min: 0, max: 10 },
    config: { display: 'range', min: 0, max: 10, step: 1, minLabel: 'Nada saudável', maxLabel: 'Muito saudável' },
  },
];

export const DEFAULT_COMPANY_QUESTIONS: QuestionnaireQuestionSeed[] = [
  {
    questionKey: 'unidade',
    text: 'Unidade ou filial avaliada',
    category: 'Identificação',
    type: 'text',
    required: true,
    position: 1,
  },
  {
    questionKey: 'num_colab',
    text: 'Número total de colaboradores',
    category: 'Identificação',
    type: 'select',
    required: true,
    position: 2,
    options: ['Até 10', '11 a 50', '51 a 100', '101 a 300', 'Acima de 300'].map((label) => ({ label, value: label })),
  },
  {
    questionKey: 'terceirizados',
    text: 'Há trabalhadores terceirizados?',
    category: 'Identificação',
    type: 'single_choice',
    required: true,
    position: 3,
    options: ['Não', 'Sim'].map((label) => ({ label, value: label })),
  },
  {
    questionKey: 'remote',
    text: 'Há home office ou trabalho híbrido?',
    category: 'Identificação',
    type: 'single_choice',
    required: true,
    position: 4,
    options: ['Não', 'Sim', 'Parcialmente'].map((label) => ({ label, value: label })),
  },
  {
    questionKey: 'setores',
    text: 'Principais setores da empresa',
    category: 'Organização do trabalho',
    type: 'textarea',
    required: true,
    position: 5,
  },
  {
    questionKey: 'setores_pressao',
    text: 'Setores com maior pressão por prazos',
    category: 'Sobrecarga e ritmo',
    type: 'text',
    required: false,
    position: 6,
  },
  {
    questionKey: 'metas_realistas',
    text: 'As metas são realistas pela gestão?',
    category: 'Sobrecarga e ritmo',
    type: 'single_choice',
    required: true,
    position: 7,
    options: [
      { label: 'Sim', value: 'Sim', score: 100 },
      { label: 'Parcialmente', value: 'Parcialmente', score: 50 },
      { label: 'Não', value: 'Não', score: 0 },
    ],
  },
  {
    questionKey: 'canal_denuncia',
    text: 'Existe canal formal para denúncias/sugestões?',
    category: 'Assédio e violência',
    type: 'single_choice',
    required: true,
    position: 8,
    options: [
      { label: 'Sim', value: 'Sim', score: 100 },
      { label: 'Em implantação', value: 'Em implantação', score: 50 },
      { label: 'Não', value: 'Não', score: 0 },
    ],
  },
  {
    questionKey: 'absenteismo',
    text: 'A empresa acompanha absenteísmo?',
    category: 'Bem-estar',
    type: 'single_choice',
    required: true,
    position: 9,
    options: [
      { label: 'Sim', value: 'Sim', score: 100 },
      { label: 'Não', value: 'Não', score: 0 },
    ],
  },
  {
    questionKey: 'fatores_estresse',
    text: 'Principais fatores de estresse identificados pela gestão',
    category: 'Bem-estar',
    type: 'textarea',
    required: false,
    position: 10,
  },
  {
    questionKey: 'name',
    text: 'Nome do respondente',
    category: 'Responsável',
    type: 'text',
    required: true,
    position: 11,
  },
  {
    questionKey: 'email',
    text: 'E-mail corporativo',
    category: 'Responsável',
    type: 'email',
    required: true,
    position: 12,
  },
];

export const DEFAULT_QUESTIONNAIRES: QuestionnaireSeed[] = [
  {
    slug: 'default-company',
    name: 'Formulário institucional padrão',
    description: 'Questionário base respondido pela gestão da empresa antes da consolidação do diagnóstico.',
    formType: 'company',
    questions: DEFAULT_COMPANY_QUESTIONS,
  },
  {
    slug: 'default-employee',
    name: 'Formulário de colaboradores padrão',
    description: 'Inventário base de riscos psicossociais respondido anonimamente pelos colaboradores.',
    formType: 'employee',
    questions: DEFAULT_EMPLOYEE_QUESTIONS,
  },
];
