import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error) => {
        console.error('Query error:', error);
      }
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  }
});
