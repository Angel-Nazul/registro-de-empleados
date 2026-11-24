import { mexicoTimeMinutes } from './datetime';

export interface CalculatedHours {
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  isValidLunch: boolean;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Jornada: 8 horas regulares. La comida (1 h) NO se paga y se descuenta
 * de los tiempos; lo que excede 8 h se cuenta como extra.
 */
export const calculateHours = (
  checkIn: Date | string | null,
  lunchOut: Date | string | null,
  lunchIn: Date | string | null,
  checkOut: Date | string | null,
): CalculatedHours => {
  if (!checkIn || !lunchOut || !lunchIn || !checkOut) {
    return { regularHours: 0, overtimeHours: 0, totalHours: 0, isValidLunch: false };
  }

  const start = new Date(checkIn).getTime();
  const out = new Date(lunchOut).getTime();
  const back = new Date(lunchIn).getTime();
  const end = new Date(checkOut).getTime();

  // Salidas antes de entradas se tratan como 0 para no generar negativos.
  if ([start, out, back, end].some(Number.isNaN) || out <= start || back <= out || end <= back) {
    return { regularHours: 0, overtimeHours: 0, totalHours: 0, isValidLunch: false };
  }

  const workedMs = out - start + (end - back);
  const totalHours = workedMs / 3_600_000;
  const regularHours = Math.min(totalHours, 8);
  const overtimeHours = Math.max(totalHours - 8, 0);

  // Comida válida: exactamente 1 h y dentro de 12:00–15:00 (hora México).
  const outMinutes = mexicoTimeMinutes(new Date(lunchOut));
  const backMinutes = mexicoTimeMinutes(new Date(lunchIn));
  const lunchMinutes = (back - out) / 60_000;
  const isValidLunch =
    lunchMinutes === 60 && outMinutes >= 720 && outMinutes <= 900 && backMinutes >= 720 && backMinutes <= 900;

  return {
    regularHours: round2(regularHours),
    overtimeHours: round2(overtimeHours),
    totalHours: round2(totalHours),
    isValidLunch,
  };
};

/** Retardo: entrada posterior a las 09:00 (hora México). */
export const isTardy = (checkIn: Date | null | undefined): boolean => {
  if (!checkIn) return false;
  return mexicoTimeMinutes(new Date(checkIn)) > 9 * 60;
};

/** Orden cronológico estricto de los cuatro tiempos. */
export const hasValidTimeOrder = (
  checkIn: Date,
  lunchOut: Date,
  lunchIn: Date,
  checkOut: Date,
): boolean => checkIn < lunchOut && lunchOut < lunchIn && lunchIn < checkOut;
