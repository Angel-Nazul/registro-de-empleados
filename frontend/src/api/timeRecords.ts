import api from './axios';
import type { TimeRecord, TimeRecordFormValues } from '../types';

export interface TimeRecordFilters {
  employeeId?: number;
  from?: string;
  to?: string;
}

export const getTimeRecords = async (filters: TimeRecordFilters = {}): Promise<TimeRecord[]> => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  const { data } = await api.get<{ timeRecords: TimeRecord[] }>('/time-records', { params });
  return data.timeRecords;
};

export const getTodayRecord = async (): Promise<{
  date: string;
  hasRecord: boolean;
  timeRecord: TimeRecord | null;
}> => {
  const { data } = await api.get<{
    date: string;
    hasRecord: boolean;
    timeRecord: TimeRecord | null;
  }>('/time-records/today');
  return data;
};

export const createTimeRecord = async (
  values: TimeRecordFormValues,
): Promise<{ timeRecord: TimeRecord; warning: string | null }> => {
  const { data } = await api.post<{ timeRecord: TimeRecord; warning: string | null }>(
    '/time-records',
    values,
  );
  return data;
};

export const updateTimeRecord = async (
  id: number,
  values: TimeRecordFormValues,
): Promise<{ timeRecord: TimeRecord; warning: string | null }> => {
  const { data } = await api.put<{ timeRecord: TimeRecord; warning: string | null }>(
    `/time-records/${id}`,
    values,
  );
  return data;
};

export const deleteTimeRecord = async (id: number): Promise<void> => {
  await api.delete(`/time-records/${id}`);
};
