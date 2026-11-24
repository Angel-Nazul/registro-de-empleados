/** Utilidades de formato para México (MXN, DD/MM/YYYY, America/Mexico_City). */

const MXN_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const formatCurrency = (amount: number): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('es-MX', MXN_FORMAT)} MXN`;
};

/** Acepta 'YYYY-MM-DD', ISO o Date y devuelve DD/MM/YYYY. */
export const formatDate = (date: string | Date): string => {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    }).format(date);
  }

  // Evitamos el desfase de zona horaria al venir de una fecha SQL.
  const sqlDate = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (sqlDate) {
    return `${sqlDate[3]}/${sqlDate[2]}/${sqlDate[1]}`;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(parsed);
};

/** Devuelve HH:mm en hora del centro de México. */
export const formatTime = (time: string | Date): string => {
  if (time instanceof Date) {
    if (Number.isNaN(time.getTime())) return '—';
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Mexico_City',
    }).format(time);
  }

  const plainTime = time.match(/^(\d{1,2}):(\d{2})/);
  if (plainTime) {
    return `${plainTime[1].padStart(2, '0')}:${plainTime[2]}`;
  }

  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  }).format(parsed);
};
