import { Loader2 } from 'lucide-react';

/** Bloques de carga consistentes en toda la aplicación. */
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />
);

export const Spinner = ({ label }: { label?: string }) => (
  <span className="inline-flex items-center gap-2 text-sm text-slate-500">
    <Loader2 size={16} className="animate-spin text-brand-600" />
    {label ?? 'Cargando...'}
  </span>
);

export const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex gap-6 border-b border-slate-200 bg-slate-50 px-4 py-4">
      {Array.from({ length: columns }, (_, index) => (
        <Skeleton key={index} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="flex gap-6 border-b border-slate-100 px-4 py-4 last:border-0">
        {Array.from({ length: columns }, (_, column) => (
          <Skeleton key={column} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const PageLoader = ({ label = 'Cargando información...' }: { label?: string }) => (
  <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white">
    <Loader2 size={28} className="animate-spin text-brand-600" />
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);
