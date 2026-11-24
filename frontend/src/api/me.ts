import api from './axios';
import type { MySummary } from '../types';

export const getMySummary = async (month: string): Promise<MySummary> => {
  const { data } = await api.get<MySummary>('/me/summary', { params: { month } });
  return data;
};
