import * as XLSX from 'xlsx-js-style';
import type { AttendanceRow, AttendanceSummaryRow, ReportFilters } from './reports';

/** Hoja de cálculo de asistencia con estilos compatibles con Excel/LibreOffice. */
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '4F46E5' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};
const MONEY_FORMAT = '"$"#,##0.00" MXN"';

const attendanceHeaders = [
  'Empleado',
  'Departamento',
  'Fecha',
  'Entrada',
  'Salida comida',
  'Regreso comida',
  'Salida final',
  'Horas reg.',
  'Horas extra',
  'Retardo',
  'Comida fuera de política',
  'Notas',
];

const summaryHeaders = [
  'Empleado',
  'Departamento',
  'Días trabajados',
  'Horas reg.',
  'Horas extra',
  'Retardos',
  'Descuento retardos',
  'Otros descuentos',
  'Neto',
];

const toRows = <T>(headers: string[], rows: T[][], moneyColumns: number[] = []): XLSX.WorkSheet => {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows] as unknown[][]);
  const headerCount = headers.length;

  for (let column = 0; column < headerCount; column += 1) {
    const reference = XLSX.utils.encode_cell({ r: 0, c: column });
    const cell = sheet[reference];
    if (cell) cell.s = HEADER_STYLE;
  }

  for (let row = 1; row <= rows.length; row += 1) {
    for (const column of moneyColumns) {
      const reference = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[reference];
      if (cell) cell.z = MONEY_FORMAT;
    }
  }

  // Autofit aproximado: ancho del contenido más largo, con límites razonables.
  sheet['!cols'] = headers.map((header, column) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, String(row[column] ?? '').length),
      header.length,
    );
    return { wch: Math.min(Math.max(longest + 2, 11), 45) };
  });

  return sheet;
};

export const attendanceToRows = (rows: AttendanceRow[]): unknown[][] =>
  rows.map((row) => [
    row.employee,
    row.department,
    row.date,
    row.checkIn ?? '—',
    row.lunchOut ?? '—',
    row.lunchIn ?? '—',
    row.checkOut ?? '—',
    row.regularHours,
    row.overtimeHours,
    row.hasTardiness ? 'SÍ' : 'NO',
    row.hasLunchIssue ? 'SÍ' : 'NO',
    row.notes ?? '',
  ]);

const summaryToRows = (rows: AttendanceSummaryRow[]): unknown[][] =>
  rows.map((row) => [
    row.employee,
    row.department,
    row.daysWorked,
    row.regularHours,
    row.overtimeHours,
    row.tardinessCount,
    row.tardinessDeduction,
    row.otherDeductions,
    row.netSalary,
  ]);

/** Genera el workbook: hoja "Asistencia" + hoja "Resumen". */
export const buildExcel = (
  rows: AttendanceRow[],
  summary: AttendanceSummaryRow[],
): Buffer => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    toRows(attendanceHeaders, attendanceToRows(rows)),
    'Asistencia',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    toRows(summaryHeaders, summaryToRows(summary), [6, 7, 8]),
    'Resumen',
  );

  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'buffer',
    compression: true,
  }) as Buffer;
};

/** CSV con separador coma y BOM UTF-8 para que Excel respete acentos y $. */
export const buildCsv = (rows: AttendanceRow[]): Buffer => {
  const sheet = XLSX.utils.aoa_to_sheet([attendanceHeaders, ...attendanceToRows(rows)] as unknown[][]);
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',' });
  return Buffer.from(`\uFEFF${csv}`, 'utf8');
};

export const reportFileName = (filters: ReportFilters, extension: 'xlsx' | 'csv'): string =>
  `asistencia_${filters.from}_a_${filters.to}.${extension}`;
