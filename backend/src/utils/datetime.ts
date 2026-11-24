/** Manejo explícito de fechas en zona America/Mexico_City. */

const TIME_ZONE = 'America/Mexico_City';

/** YYYY-MM-DD en hora de México (para "hoy"). */
export const mexicoDateKey = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
};

/** Llave UTC para campos DateTime que guardan solo fecha (medianoche UTC). */
export const toUTCDateKey = (date: Date | string): string =>
  new Date(date).toISOString().slice(0, 10);

/** Convierte una llave YYYY-MM-DD en medianoche UTC (valor almacenado en BD). */
export const dateKeyToDate = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

export const isValidDateKey = (key: unknown): key is string =>
  typeof key === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(key) &&
  !Number.isNaN(dateKeyToDate(key).getTime());

export const isValidTime = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours <= 23 && minutes <= 59;
};

/** Offset de la zona en minutos para un instante dado (maneja horario de verano). */
const offsetMinutes = (instant: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(instant);
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT-6';
  const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return -360; // México normalmente UTC-6

  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
};

/** Construye el instante UTC correcto para "YYYY-MM-DD HH:mm" en hora de México. */
export const parseMexicoDateTime = (dateKey: string, hhmm: string): Date => {
  const offset = offsetMinutes(new Date(`${dateKey}T${hhmm}:00Z`));
  const sign = offset <= 0 ? '-' : '+';
  const absolute = Math.abs(offset);
  const zone = `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(
    absolute % 60,
  ).padStart(2, '0')}`;
  return new Date(`${dateKey}T${hhmm}:00${zone}`);
};

/** Minutos desde medianoche en hora de México. */
export const mexicoTimeMinutes = (instant: Date): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return value('hour') * 60 + value('minute');
};

/** HH:mm en hora de México (null si no hay hora). */
export const formatMexicoTime = (instant: Date | null | undefined): string | null => {
  if (!instant) return null;
  const minutes = mexicoTimeMinutes(new Date(instant));
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** Primer día del mes (YYYY-MM) y siguiente mes como llaves UTC. */
export const monthBounds = (month: string): { from: Date; to: Date; fromKey: string; toKey: string } => {
  const [year, monthNumber] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, monthNumber - 1, 1));
  const to = new Date(Date.UTC(year, monthNumber, 1));
  return {
    from,
    to,
    fromKey: toUTCDateKey(from),
    toKey: toUTCDateKey(to),
  };
};

export const isValidMonthKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
