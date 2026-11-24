import api from './axios';
import { fileNameFromDisposition, saveBlob } from '../utils/download';
import type { AttendanceSummaryRow, ReportFilters, ReportsResponse } from '../types';

const paramsOf = (filters: ReportFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );

export const getAttendance = async (filters: ReportFilters): Promise<ReportsResponse> => {
  const { data } = await api.get<ReportsResponse>('/reports/attendance', {
    params: paramsOf(filters),
  });
  return data;
};

export const getAttendanceSummary = async (
  filters: ReportFilters,
): Promise<AttendanceSummaryRow[]> => {
  const { data } = await api.get<{ summary: AttendanceSummaryRow[] }>(
    '/reports/attendance/summary',
    { params: paramsOf(filters) },
  );
  return data.summary;
};

const downloadReport = async (
  path: string,
  filters: ReportFilters,
  fallbackName: string,
): Promise<string> => {
  const response = await api.get<Blob>(path, {
    params: paramsOf(filters),
    responseType: 'blob',
  });
  const fileName = fileNameFromDisposition(
    response.headers['content-disposition'] as string | undefined,
    fallbackName,
  );
  saveBlob(response.data, fileName);
  return fileName;
};

export const exportExcel = (filters: ReportFilters): Promise<string> =>
  downloadReport('/reports/export/excel', filters, 'asistencia.xlsx');

export const exportCsv = (filters: ReportFilters): Promise<string> =>
  downloadReport('/reports/export/csv', filters, 'asistencia.csv');
