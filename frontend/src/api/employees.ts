import api from './axios';
import type { Employee, EmployeeFormValues, EmployeeStatus } from '../types';

export interface EmployeeFilters {
  status?: EmployeeStatus | '';
  department?: string;
  search?: string;
}

export const getEmployees = async (filters: EmployeeFilters = {}): Promise<Employee[]> => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)));
  const { data } = await api.get<{ employees: Employee[] }>('/employees', { params });
  return data.employees;
};

export const getEmployee = async (id: number): Promise<Employee> => {
  const { data } = await api.get<{ employee: Employee }>(`/employees/${id}`);
  return data.employee;
};

export const createEmployee = async (values: EmployeeFormValues): Promise<Employee> => {
  const { data } = await api.post<{ employee: Employee }>('/employees', values);
  return data.employee;
};

export const updateEmployee = async (id: number, values: EmployeeFormValues): Promise<Employee> => {
  const { data } = await api.put<{ employee: Employee }>(`/employees/${id}`, values);
  return data.employee;
};

export const deactivateEmployee = async (id: number): Promise<Employee> => {
  const { data } = await api.delete<{ employee: Employee }>(`/employees/${id}`);
  return data.employee;
};
