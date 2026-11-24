import type { ReactNode } from 'react';
import type { EmployeeStatus } from '../types';

type Tone = 'green' | 'gray' | 'red' | 'yellow' | 'brand' | 'blue' | 'slate';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  yellow: 'bg-amber-50 text-amber-800 ring-amber-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  slate: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export const Badge = ({
  tone = 'slate',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
  >
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: EmployeeStatus | string }) =>
  status === 'ACTIVO' ? (
    <Badge tone="green">ACTIVO</Badge>
  ) : (
    <Badge tone="gray">INACTIVO</Badge>
  );

export const TardinessBadge = ({ tardy }: { tardy: boolean }) =>
  tardy ? <Badge tone="red">RETARDO</Badge> : <Badge tone="gray">A tiempo</Badge>;

export const OvertimeBadge = ({ hours }: { hours: number }) =>
  hours > 0 ? <Badge tone="yellow">+{hours.toFixed(1)} h extra</Badge> : null;
