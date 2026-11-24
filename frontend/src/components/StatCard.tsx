import type { LucideIcon } from 'lucide-react';

type Tone = 'brand' | 'emerald' | 'amber' | 'red' | 'slate' | 'blue';

const tones: Record<Tone, { icon: string; value: string }> = {
  brand: { icon: 'bg-brand-50 text-brand-600', value: 'text-slate-900' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
  amber: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' },
  red: { icon: 'bg-red-50 text-red-600', value: 'text-red-700' },
  slate: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
  blue: { icon: 'bg-blue-50 text-blue-600', value: 'text-blue-700' },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
}

const StatCard = ({ label, value, icon: Icon, tone = 'brand', hint }: StatCardProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{label}</p>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone].icon}`}>
        <Icon size={18} />
      </span>
    </div>
    <p className={`mt-3 truncate text-2xl font-bold ${tones[tone].value}`} title={value}>
      {value}
    </p>
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);

export default StatCard;
