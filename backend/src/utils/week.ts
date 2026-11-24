/** Utilidades de semana en llaves YYYY-MM-DD (medianoche UTC). */
import { dateKeyToDate, toUTCDateKey } from './datetime';

export const addDays = (key: string, days: number): string => {
  const date = dateKeyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toUTCDateKey(date);
};
