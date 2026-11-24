/** Descarga un Blob en el navegador sin salir de la página. */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

/** Lee el nombre de archivo del header Content-Disposition. */
export const fileNameFromDisposition = (header: string | undefined, fallback: string): string => {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
};
