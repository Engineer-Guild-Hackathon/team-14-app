import axios, { AxiosError, AxiosRequestConfig } from 'axios';

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Base configuration
const BASE_URL = import.meta.env.VITE_API_URL || 'https://codeclimb.omori.f5.si/api';
const TIMEOUT = 10000;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Handle specific error codes
      if (error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }

      const apiError: ApiError = {
        code: error.response.data?.code || 'UNKNOWN_ERROR',
        message: error.response.data?.message || 'An error occurred',
        details: error.response.data?.details,
      };
      
      return Promise.reject(apiError);
    } else if (error.request) {
      // Network error
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
      };
      return Promise.reject(apiError);
    } else {
      // Other errors
      const apiError: ApiError = {
        code: 'CLIENT_ERROR',
        message: error.message,
      };
      return Promise.reject(apiError);
    }
  }
);

/**
 * 汎用API呼び出し関数
 * @param config Axios request configuration
 * @returns Promise with response data
 */
export async function apiRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await axiosInstance(config);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * ファイルアップロード関数
 * @param url Upload endpoint
 * @param file File to upload
 * @param onProgress Optional progress callback
 * @returns Promise with response data
 */
export async function uploadFile(
  url: string,
  file: File,
  onProgress?: (progressEvent: any) => void
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest({
    method: 'POST',
    url,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress,
  });
}

/**
 * ファイルダウンロード関数
 * @param url Download endpoint
 * @param filename Optional filename for the downloaded file
 * @returns Promise with blob data
 */
export async function downloadFile(url: string, filename?: string): Promise<Blob> {
  const response = await axiosInstance({
    method: 'GET',
    url,
    responseType: 'blob',
  });

  // If filename is provided, trigger download
  if (filename && typeof window !== 'undefined') {
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  return response.data;
}

// Convenience methods for common API calls
export const api = {
  // Generic HTTP methods
  get: (url: string) =>
    apiRequest({ method: 'GET', url }),
  
  post: (url: string, data?: any) =>
    apiRequest({ method: 'POST', url, data }),
  
  put: (url: string, data?: any) =>
    apiRequest({ method: 'PUT', url, data }),
  
  delete: (url: string) =>
    apiRequest({ method: 'DELETE', url }),

  // Auth
  login: (email: string, password: string) => 
    apiRequest({ method: 'POST', url: '/auth/login', data: { email, password } }),
  
  register: (data: { email: string; password: string; name: string }) =>
    apiRequest({ method: 'POST', url: '/auth/register', data }),
  
  logout: () =>
    apiRequest({ method: 'POST', url: '/auth/logout' }),

  // Projects
  getProjects: () =>
    apiRequest({ method: 'GET', url: '/projects' }),
  
  createProject: (data: any) =>
    apiRequest({ method: 'POST', url: '/projects', data }),
  
  getProject: (id: string) =>
    apiRequest({ method: 'GET', url: `/projects/${id}` }),
  
  updateProject: (id: string, data: any) =>
    apiRequest({ method: 'PUT', url: `/projects/${id}`, data }),
  
  deleteProject: (id: string) =>
    apiRequest({ method: 'DELETE', url: `/projects/${id}` }),

  // Quests
  generateQuest: (data: any) =>
    apiRequest({ method: 'POST', url: '/quests/generate', data }),
  
  getQuests: () =>
    apiRequest({ method: 'GET', url: '/quests' }),
  
  getQuest: (id: string) =>
    apiRequest({ method: 'GET', url: `/quests/${id}` }),
  
  updateQuestProgress: (id: string, data: any) =>
    apiRequest({ method: 'PUT', url: `/quests/${id}/progress`, data }),
  
  verifyQuestCode: (id: string, data: any) =>
    apiRequest({ method: 'POST', url: `/quests/${id}/verify`, data }),

  // Analytics
  getAnalytics: () =>
    apiRequest({ method: 'GET', url: '/analytics/progress' }),
  
  getCodeHistory: () =>
    apiRequest({ method: 'GET', url: '/analytics/code-history' }),
  
  getLearningPattern: () =>
    apiRequest({ method: 'GET', url: '/analytics/learning-pattern' }),

  // Portfolio
  createAchievement: (data: any) =>
    apiRequest({ method: 'POST', url: '/achievements/summit', data }),
  
  getAchievements: () =>
    apiRequest({ method: 'GET', url: '/achievements' }),
  
  publishPortfolio: (id: string) =>
    apiRequest({ method: 'POST', url: `/achievements/${id}/portfolio` }),
  
  getPortfolio: () =>
    apiRequest({ method: 'GET', url: '/portfolio' }),

  // Peer Review
  requestReview: (data: any) =>
    apiRequest({ method: 'POST', url: '/reviews/request', data }),
  
  getReviewRequests: () =>
    apiRequest({ method: 'GET', url: '/reviews/requests' }),
  
  submitReview: (id: string, data: any) =>
    apiRequest({ method: 'POST', url: `/reviews/${id}/submit`, data }),
  
  getGivenReviews: () =>
    apiRequest({ method: 'GET', url: '/reviews/given' }),

  // Teacher Dashboard
  getTeacherDashboard: () =>
    apiRequest({ method: 'GET', url: '/teacher/dashboard' }),
  
  getStudents: () =>
    apiRequest({ method: 'GET', url: '/teacher/students' }),
  
  getStudentProgress: (id: string) =>
    apiRequest({ method: 'GET', url: `/teacher/students/${id}/progress` }),
  
  sendFeedback: (id: string, data: any) =>
    apiRequest({ method: 'POST', url: `/teacher/students/${id}/feedback`, data }),

  // Teacher Classroom Management
  createClassroom: (data: { name: string; description?: string }) =>
    apiRequest({ method: 'POST', url: '/teacher/classrooms', data }),
  
  createAssignment: (data: any) =>
    apiRequest({ method: 'POST', url: '/teacher/assignments', data }),
};

// For backward compatibility with existing code that imports APIClient
export class APIClient {
  login = api.login;
  register = api.register;
  logout = api.logout;
  getProjects = api.getProjects;
  createProject = api.createProject;
  getProject = api.getProject;
  updateProject = api.updateProject;
  deleteProject = api.deleteProject;
  generateQuest = api.generateQuest;
  getQuests = api.getQuests;
  getQuest = api.getQuest;
  updateQuestProgress = api.updateQuestProgress;
  verifyQuestCode = api.verifyQuestCode;
  getAnalytics = api.getAnalytics;
  getCodeHistory = api.getCodeHistory;
  getLearningPattern = api.getLearningPattern;
  createAchievement = api.createAchievement;
  getAchievements = api.getAchievements;
  publishPortfolio = api.publishPortfolio;
  getPortfolio = api.getPortfolio;
  requestReview = api.requestReview;
  getReviewRequests = api.getReviewRequests;
  submitReview = api.submitReview;
  getGivenReviews = api.getGivenReviews;
  getTeacherDashboard = api.getTeacherDashboard;
  getStudents = api.getStudents;
  getStudentProgress = api.getStudentProgress;
  sendFeedback = api.sendFeedback;
}

export default api;