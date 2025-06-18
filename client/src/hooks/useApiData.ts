import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
}

export const useUserData = () => {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['userData'],
    queryFn: async (): Promise<UserData> => {
      const response = await apiClient.get('/user');
      return response.data;
    },
    enabled: isAuthenticated,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData: Partial<UserData>) => {
      const response = await apiClient.put('/user', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });
};