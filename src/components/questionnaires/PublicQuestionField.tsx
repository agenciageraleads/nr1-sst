import { CheckCircle2 } from 'lucide-react';
import { QuestionnaireQuestion } from '../../lib/api';
import { cn } from '../../lib/utils';

type PublicQuestionFieldProps = {
  question: QuestionnaireQuestion;
  value: any;
  onChange: (value: any) => void;
};

export function PublicQuestionField({ question, value, onChange }: PublicQuestionFieldProps) {
  const commonInputClass = 'w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none';

  if (question.type === 'textarea') {
    return (
      <textarea
        rows={4}
        value={value || ''}
        className={commonInputClass}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === 'text' || question.type === 'email') {
    return (
      <input
        type={question.type === 'email' ? 'email' : 'text'}
        value={value || ''}
        className={commonInputClass}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (question.type === 'number') {
    const min = Number(question.config?.min ?? question.scoring?.min ?? 0);
    const max = Number(question.config?.max ?? question.scoring?.max ?? 100);
    const step = Number(question.config?.step ?? 1);
    const displayValue = value ?? min;

    if (question.config?.display === 'range') {
      return (
        <div className="space-y-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={displayValue}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{question.config?.minLabel || min}</span>
            <span className="text-blue-600 text-base">{displayValue}</span>
            <span>{question.config?.maxLabel || max}</span>
          </div>
        </div>
      );
    }

    return (
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value || ''}
        className={commonInputClass}
        onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
      />
    );
  }

  if (question.type === 'select') {
    return (
      <select value={value || ''} className={commonInputClass} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione...</option>
        {(question.options || []).map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          className="mt-1 w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="text-sm text-slate-600 font-medium">{question.description || 'Confirmar'}</span>
      </label>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {(question.options || []).map((option) => {
        const selected = String(value) === String(option.value);
        return (
          <button
            type="button"
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left',
              selected
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50/30'
            )}
          >
            {option.label}
            {selected && <CheckCircle2 className="w-4 h-4 ml-2" />}
          </button>
        );
      })}
    </div>
  );
}
