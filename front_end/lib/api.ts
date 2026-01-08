// API client for backend communication
// Uses relative paths so requests go through Nginx on same origin

const API_BASE = '/api/front_end'

export interface ApiResponse<T = any> {
  status: 'success' | 'error'
  message?: string
  data?: T
  [key: string]: any
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  status: 'success'
  access_token: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface UserProfile {
  User_ID: number
  Username: string
  Admin_Status: boolean
}

// Token management
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

export const removeToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized
  // For auth endpoints (login/register), we should NOT redirect/reload the page;
  // instead, let the caller surface the backend message (e.g. "Invalid credentials").
  if (response.status === 401) {
    const isAuthEndpoint = endpoint === '/user/login' || endpoint === '/user/register'
    if (!isAuthEndpoint) {
      removeToken()
      if (typeof window !== 'undefined') {
        // Avoid unnecessary reload loops if we're already on /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      throw new Error('Unauthorized')
    }
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    throw new Error('Forbidden: Admin access required')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

// Auth endpoints
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return apiRequest<LoginResponse>('/user/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>('/user/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    return apiRequest<ApiResponse<UserProfile>>('/user/profile', {
      method: 'GET',
    })
  },

  updateUsername: async (username: string): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>('/user/profile', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })
  },

  updatePassword: async (password: string): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    })
  },

  deleteProfile: async (): Promise<ApiResponse> => {
    return apiRequest<ApiResponse>('/user/profile', {
      method: 'DELETE',
    })
  },
}

// Admin endpoints
export const adminApi = {
  listUsers: async (): Promise<ApiResponse<{ users: Array<{ User_ID: number; Username: string; Admin_Status: boolean }> }>> => {
    return apiRequest('/admin/users', {
      method: 'GET',
    })
  },

  deleteUser: async (userId: number): Promise<ApiResponse> => {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    })
  },
}

// Machine endpoints
export interface MachineDetail {
  Machine_ID: number
  Hostname: string
  Platform: string
  Is_Hypervisor: boolean
  Max_Cores: number
  Max_Memory: number // bytes
  Max_Disk: number // bytes
  Owner_ID: number | null
  Hosted_On_ID: number | null
}

export interface MachineMetrics {
  Timestamp: string
  Current_CPU_Usage: number
  Current_Memory_Usage: any
  Current_Disk_Usage: any
}

export interface MachineMetricsHistoryResponse {
  status: 'success' | 'error'
  message?: string
  Hostname: string
  Machine_ID: number
  count: number
  metrics: MachineMetrics[]
}

export type MetricsHistoryQuery = {
  start?: string
  end?: string
  after?: string
  before?: string
  limit?: number
  order?: 'asc' | 'desc'
}

export const machineApi = {
  listMachines: async (): Promise<MachineDetail[]> => {
    // Backend returns array directly, not wrapped in {status, data}
    return apiRequest<MachineDetail[]>('/machines/list', {
      method: 'GET',
    })
  },

  getMachineInfo: async (hostname: string): Promise<MachineDetail> => {
    return apiRequest<MachineDetail>(`/machine/info/${encodeURIComponent(hostname)}`, {
      method: 'GET',
    })
  },

  getMachineMetrics: async (hostname: string): Promise<MachineMetrics> => {
    return apiRequest<MachineMetrics>(`/machine/info/${encodeURIComponent(hostname)}/metrics`, {
      method: 'GET',
    })
  },

  getMachineMetricsHistory: async (
    hostname: string,
    query: MetricsHistoryQuery = {}
  ): Promise<MachineMetricsHistoryResponse> => {
    const params = new URLSearchParams()
    if (query.start) params.set('start', query.start)
    if (query.end) params.set('end', query.end)
    if (query.after) params.set('after', query.after)
    if (query.before) params.set('before', query.before)
    if (query.order) params.set('order', query.order)
    if (typeof query.limit === 'number') params.set('limit', String(query.limit))

    const qs = params.toString()
    return apiRequest<MachineMetricsHistoryResponse>(
      `/machine/info/${encodeURIComponent(hostname)}/metrics/history${qs ? `?${qs}` : ''}`,
      { method: 'GET' }
    )
  },
}

