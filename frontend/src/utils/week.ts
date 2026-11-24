import { formatDate } from './formatters';

/** Utilidades de semana (lunes a domingo) usando llaves YYYY-MM-DD. */

const parseKey = (key: string): Date => new Date(`${key}T00:00:00Z`);
const toKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Hoy en America/Mexico_City. */
export const todayKey = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

export const getMondayKey = (key: string): string => {
  const date = parseKey(key);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return toKey(date);
};

export const shiftWeek = (mondayKey: string, delta: number): string => {
  const date = parseKey(mondayKey);
  date.setUTCDate(date.getUTCDate() + delta * 7);
  return toKey(date);
};

export const addDays = (key: string, days: number): string => {
  const date = parseKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
};

export const weekRangeLabel = (mondayKey: string): string =>
  `${formatDate(mondayKey)} – ${formatDate(addDays(mondayKey, 6))}`;

/** Llaves YYYY-MM-DD para el primer y último día de un mes YYYY-MM. */
export const monthStartKey = (month: string): string => `${month}-01`;

export const monthEndKey = (month: string): string => {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0));
  return toKey(last);
};

export const shiftMonth = (month: string, delta: number): string => {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
