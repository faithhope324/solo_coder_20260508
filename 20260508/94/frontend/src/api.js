import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const runSimulation = (data) => {
  return api.post('/api/simulate', data);
};

export const getSimulationStatus = (taskId) => {
  return api.get(`/api/status/${taskId}`);
};

export const healthCheck = () => {
  return api.get('/api/health');
};

export default api;
