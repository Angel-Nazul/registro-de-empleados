import api from './axios';
import type { AdminDashboard, EmployeeDashboard } from '../types';

export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  const { data } = await api.get<AdminDashboard>('/dashboard/admin');
  return data;
};

export const getEmployeeDashboard = async (): Promise<EmployeeDashboard> => {
  const { data } = await api.get<EmployeeDashboard>('/dashboard/employee');
  return data;
};
