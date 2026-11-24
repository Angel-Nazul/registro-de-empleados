/** Extrae el mensaje del cuerpo de error de la API para mostrarlo en un toast. */
export const errorMessage = (
  error: unknown,
  fallback = 'No se pudo completar la operación',
): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  return fallback;
};
