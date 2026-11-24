export type UserRole = 'ADMIN' | 'EMPLEADO';
export type ContractType = 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'TEMPORAL';
export type EmployeeStatus = 'ACTIVO' | 'INACTIVO';

export interface Employee {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
  hireDate: string;
  hourlyRate: number;
  contractType: ContractType;
  status: EmployeeStatus;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
  account?: { id: number; email: string; role: UserRole } | null;
}

export interface TimeRecord {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  regularHours: number;
  overtimeHours: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { fullName: string };
}

export interface PayrollRow {
  id: number;
  employeeId: number;
  employeeName: string;
  position: string;
  department: string;
  status: string;
  weekStart: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  baseSalary: number;
  overtimePay: number;
  tardinessDeduction: number;
  complianceDeduction: number;
  otherDeductions: number;
  netSalary: number;
  daysWorked: number;
}

export interface EmployeeFormValues {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
  hourlyRate: number;
  contractType: ContractType;
  status: EmployeeStatus;
  createAccess: boolean;
  password: string;
}

export interface TimeRecordFormValues {
  employeeId?: number;
  date: string;
  checkIn: string;
  lunchOut: string;
  lunchIn: string;
  checkOut: string;
  notes: string;
}

/* ------------------------------- Reportes -------------------------------- */

export interface AttendanceRow {
  employeeId: number;
  employee: string;
  department: string;
  position: string;
  date: string;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  regularHours: number;
  overtimeHours: number;
  hasLunchIssue: boolean;
  hasTardiness: boolean;
  notes: string | null;
}

export interface AttendanceSummaryRow {
  employeeId: number;
  employee: string;
  department: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  tardinessCount: number;
  tardinessDeduction: number;
  otherDeductions: number;
  netSalary: number;
}

export interface ReportFilters {
  from: string;
  to: string;
  employeeId?: number;
  department?: string;
}

export interface ReportsResponse {
  rows: AttendanceRow[];
  summary: AttendanceSummaryRow[];
  filters: ReportFilters;
}

/* ------------------------------- Dashboards ------------------------------ */

export interface AdminDashboard {
  activeEmployees: number;
  employees: Array<{ id: number; fullName: string; department: string; position: string }>;
  weeklyHours: number;
  weeklyPayroll: number;
  employeesWithTardiness: Array<{
    employeeId: number;
    employee: string;
    department: string;
    count: number;
  }>;
  recentRecords: Array<{
    id: number;
    employee: string;
    date: string;
    hours: number;
    overtimeHours: number;
    hasTardiness: boolean;
  }>;
  hoursByEmployee: Array<{
    employeeId: number;
    employee: string;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
  }>;
  payrollByDepartment: Array<{ department: string; total: number }>;
  hoursByDay: Array<{ date: string; hours: number }>;
  weekStart: string;
}

export interface EmployeeDashboard {
  employee: { id: number; fullName: string; position: string; department: string };
  weeklyHours: number;
  weeklyEstimatedPay: number;
  lastRecords: Array<{
    id: number;
    date: string;
    regularHours: number;
    overtimeHours: number;
    hasTardiness: boolean;
  }>;
  todayStatus: { date: string; hasRecord: boolean; timeRecord: TimeRecord | null };
  weekStart: string;
}

/* --------------------------- Panel RH (Mi panel) -------------------------- */

export interface SummaryRecord {
  id: number;
  date: string;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  regularHours: number;
  overtimeHours: number;
  notes: string | null;
  hasTardiness: boolean;
}

export interface MySummary {
  month: string;
  employee: Employee;
  profile: Employee;
  records: SummaryRecord[];
  recordTotals: {
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    daysWorked: number;
    tardinessCount: number;
  };
  payrolls: PayrollRow[];
  monthly: {
    month: string;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    grossSalary: number;
    deductions: number;
    netSalary: number;
    weeks: number;
  };
}
