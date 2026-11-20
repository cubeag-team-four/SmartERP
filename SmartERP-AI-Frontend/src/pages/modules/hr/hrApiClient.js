import axios from 'axios';
import { SERVER_URL } from '../../../core/constants/serverUrl.constant';
import { attachInterceptors } from '../../../core/services/interceptor.service';

// Same backend base as utils/axios.js; shares its auth interceptors
// (in-memory Bearer token, X-Tenant-Id, single-flight refresh on 401).
const hrAxios = axios.create({
  baseURL: `${SERVER_URL}/hr`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

attachInterceptors(hrAxios);

export const hrApi = {
  // Employees
  getEmployees: (params) => hrAxios.get('/employees', { params }),
  getEmployee: (id, params) => hrAxios.get(`/employees/${id}`, { params }),
  createEmployee: (data, params) => hrAxios.post('/employees', data, { params }),
  updateEmployee: (id, data, params) => hrAxios.put(`/employees/${id}`, data, { params }),
  deleteEmployee: (id, params) => hrAxios.delete(`/employees/${id}`, { params }),

  // Dashboard
  getDashboard: (params) => hrAxios.get('/dashboard', { params }),

  // Attendance
  getAttendance: (params) => hrAxios.get('/attendance', { params }),
  logAttendance: (data, params) => hrAxios.post('/attendance', data, { params }),

  // Leaves
  getLeaves: (params) => hrAxios.get('/leaves', { params }),
  getLeaveBalance: (year, params) => hrAxios.get('/leaves/balance', { params: { ...(params || {}), ...(year ? { year } : {}) } }),
  createLeave: (data, params) => hrAxios.post('/leaves', data, { params }),
  updateLeave: (id, data, params) => hrAxios.put(`/leaves/${id}`, data, { params }),
  deleteLeave: (id, params) => hrAxios.delete(`/leaves/${id}`, { params }),
  exportLeaves: (year, params) => hrAxios.get('/leaves/export', { params: { ...(params || {}), ...(year ? { year } : {}) }, responseType: 'blob' }),
  approveLeave: (id, params) => hrAxios.patch(`/leaves/${id}/approve`, null, { params }),
  rejectLeave: (id, params) => hrAxios.patch(`/leaves/${id}/reject`, null, { params }),

  // Payroll
  getPayrollSummary: (params) => hrAxios.get('/payroll/summary', { params }),
  getPayrolls: (params) => hrAxios.get('/payroll', { params }),
  processPayroll: (data, params) => hrAxios.post('/payroll/process', data, { params }),

  // Performance
  getPerformance: (params) => hrAxios.get('/performance', { params }),
  getPerformanceReviews: (params) => hrAxios.get('/performance/reviews', { params }),
  getDepartmentScores: (params) => hrAxios.get('/performance/department-scores', { params }),
  addPerformanceReview: (data, params) => hrAxios.post('/performance/reviews', data, { params }),
};

export default hrApi;
