import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined') {
        let token = localStorage.getItem('backend_token');

        // If no backend token, try to fetch one from Better Auth session
        if (!token) {
            try {
                const response = await fetch('/api/backend/token', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    token = data.token;
                    if (token) {
                        localStorage.setItem('backend_token', token);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch backend token:', e);
            }
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If 401 error, try to refresh the backend token
        if (error.response?.status === 401) {
            console.warn('API returned 401 - attempting to refresh backend token');

            if (typeof window !== 'undefined') {
                // Clear old token
                localStorage.removeItem('backend_token');

                // Try to get a new token from Better Auth session
                try {
                    const response = await fetch('/api/backend/token', {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (response.ok) {
                        const data = await response.json();
                        localStorage.setItem('backend_token', data.token);

                        // Retry the original request
                        error.config.headers.Authorization = `Bearer ${data.token}`;
                        return api.request(error.config);
                    }
                } catch (e) {
                    console.warn('Could not refresh backend token:', e);
                }
            }
        }
        return Promise.reject(error);
    }
);

// API Functions
export const authApi = {
    getGoogleAuthUrl: () => api.get('/api/auth/google'),
    getMe: (token?: string) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return api.get('/api/auth/me', { headers });
    },
};

export const videosApi = {
    getVideos: () => api.get('/api/videos/'),
    syncVideos: () => api.get('/api/videos/sync'),
    getSettings: (videoId: string) => api.get(`/api/videos/${videoId}/settings`),
    updateSettings: (videoId: string, settings: any) =>
        api.put(`/api/videos/${videoId}/settings`, settings),
    triggerReply: (videoId: string) =>
        api.post(`/api/videos/${videoId}/trigger-reply`),
};

export const analyticsApi = {
    getAnalytics: () => api.get('/api/analytics/'),
    getChartData: (days?: number) =>
        api.get('/api/analytics/chart', { params: { days } }),
};

export const templatesApi = {
    getTemplates: () => api.get('/api/templates/'),
    createTemplate: (template_text: string) =>
        api.post('/api/templates/', { template_text }),
    deleteTemplate: (id: number) => api.delete(`/api/templates/${id}`),
};
