import type { TimeRecordFormValues } from '../types';

/** Cálculo en vivo espejo del backend (mismas reglas de negocio). */

const round1 = (value: number): number => Math.round(value * 10) / 10;

export const toMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

export interface LiveCalculation {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  lunchValid: boolean;
  hasValidOrder: boolean;
}

export const calculateLive = (values: TimeRecordFormValues): LiveCalculation => {
  if (!values.checkIn || !values.lunchOut || !values.lunchIn || !values.checkOut) {
    return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      lunchValid: false,
      hasValidOrder: false,
    };
  }

  const start = toMinutes(values.checkIn);
  const lunchStart = toMinutes(values.lunchOut);
  const lunchEnd = toMinutes(values.lunchIn);
  const end = toMinutes(values.checkOut);

  const hasValidOrder = start < lunchStart && lunchStart < lunchEnd && lunchEnd < end;
  const workedMinutes = hasValidOrder ? lunchStart - start + (end - lunchEnd) : 0;
  const totalHours = workedMinutes / 60;
  const lunchValid =
    lunchEnd - lunchStart === 60 && lunchStart >= 720 && lunchStart <= 900 && lunchEnd >= 720 && lunchEnd <= 900;

  return {
    totalHours: round1(totalHours),
    regularHours: round1(Math.min(totalHours, 8)),
    overtimeHours: round1(Math.max(totalHours - 8, 0)),
    lunchValid,
    hasValidOrder,
  };
};
