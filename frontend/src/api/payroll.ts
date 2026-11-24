import api from './axios';
import type { PayrollRow } from '../types';

export const getWeekPayroll = async (
  weekStart: string,
): Promise<{ weekStart: string; payrolls: PayrollRow[] }> => {
  const { data } = await api.get<{ weekStart: string; payrolls: PayrollRow[] }>(
    `/payroll/week/${weekStart}`,
  );
  return data;
};

export interface PayrollUpdate {
  tardinessDeduction: number;
  complianceDeduction: number;
  otherDeductions: number;
  hourlyRateOverride?: number;
}

export const updatePayroll = async (id: number, values: PayrollUpdate): Promise<PayrollRow> => {
  const { data } = await api.put<{ payroll: PayrollRow }>(`/payroll/${id}`, values);
  return data.payroll;
};

export const getPayrollHistory = async (
  employeeId: number,
  weeks = 8,
): Promise<PayrollRow[]> => {
  const { data } = await api.get<{ history: PayrollRow[] }>(
    `/payroll/employee/${employeeId}/history`,
    { params: { weeks } },
  );
  return data.history;
};
