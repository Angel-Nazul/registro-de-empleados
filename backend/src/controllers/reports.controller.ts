import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { buildCsv, buildExcel, reportFileName } from '../utils/excel';
import {
  getAttendanceRows,
  getAttendanceSummary as buildAttendanceSummary,
  parseReportFilters,
} from '../utils/reports';

/** GET /api/reports/attendance — filas + totales por empleado. */
export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseReportFilters(req.query);
  const rows = await getAttendanceRows(filters);
  const summary = await buildAttendanceSummary(rows, filters);
  res.json({ rows, summary, filters });
});

/** GET /api/reports/attendance/summary — solo totales. */
export const getAttendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseReportFilters(req.query);
  const rows = await getAttendanceRows(filters);
  const summary = await buildAttendanceSummary(rows, filters);
  res.json({ summary, filters });
});

/** GET /api/reports/export/excel — workbook con hojas Asistencia y Resumen. */
export const exportAttendanceExcel = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseReportFilters(req.query);
  const rows = await getAttendanceRows(filters);
  const summary = await buildAttendanceSummary(rows, filters);
  const fileName = reportFileName(filters, 'xlsx');

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buildExcel(rows, summary));
});

/** GET /api/reports/export/csv — UTF-8 con BOM para Excel. */
export const exportAttendanceCsv = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseReportFilters(req.query);
  const rows = await getAttendanceRows(filters);
  const fileName = reportFileName(filters, 'csv');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buildCsv(rows));
});
