import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const clientApi = {
  getAll: () => api.get('/clients'),
  create: (data) => api.post('/clients', data),
  delete: (clientId) => api.delete(`/clients/${clientId}`)
}

export const authRecordApi = {
  getAll: () => api.get('/authorization-records'),
  revoke: (id) => api.post(`/authorization-records/${id}/revoke`)
}

export default api
