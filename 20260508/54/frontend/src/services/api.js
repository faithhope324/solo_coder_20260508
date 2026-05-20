import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const getSummary = () => api.get('/summary').then(res => res.data);
export const getCostTrend = () => api.get('/cost-trend').then(res => res.data);
export const getServiceDistribution = () => api.get('/service-distribution').then(res => res.data);
export const getCostByEnvironment = () => api.get('/cost-by-environment').then(res => res.data);
export const getCostByDepartment = () => api.get('/cost-by-department').then(res => res.data);
export const getSavingsSuggestions = () => api.get('/savings-suggestions').then(res => res.data);
export const getMonthlyReport = (year, month) => 
  api.get('/monthly-report', { params: { year, month } }).then(res => res.data);
export const exportMonthlyReport = (year, month) => 
  api.get('/export/monthly-report', { 
    params: { year, month },
    responseType: 'blob'
  });

export default api;
