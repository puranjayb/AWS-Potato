import axios from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'https://your-api-gateway-url.com',
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // User not authenticated
      console.log('No valid session found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      try {
        await signOut();
        window.location.href = '/login';
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;