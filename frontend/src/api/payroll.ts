import client from './client';

export interface RunPayrollData {
  start_date: string;
  end_date: string;
  adjustments?: {
    user_id: number;
    commission_pay: number;
    overtime_pay: number;
    half_day_deductions: number;
  }[];
}

export interface UpdateSalaryData {
  base_salary: number;
  allowances: number;
  deductions: number;
}

export const payrollApi = {
  listCycles: () =>
    client.get('/payroll/cycles'),

  getCycle: (id: number) =>
    client.get(`/payroll/cycles/${id}`),

  runPayroll: (data: RunPayrollData) =>
    client.post('/payroll/cycles', data),

  releasePayroll: (id: number) =>
    client.post(`/payroll/cycles/${id}/release`),

  deleteCycle: (id: number) =>
    client.delete(`/payroll/cycles/${id}`),

  listEmployees: (params?: { search?: string }) =>
    client.get('/payroll/employees', { params }),

  updateEmployeeSalary: (id: number, data: UpdateSalaryData) =>
    client.put(`/payroll/employees/${id}`, data),

  updatePayslip: (id: number, data: any) =>
    client.put(`/payroll/payslips/${id}`, data),
};
