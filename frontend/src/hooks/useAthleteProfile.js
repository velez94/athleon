import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from 'aws-amplify';

// Fetch athlete profile
export const useAthleteProfile = (user) => {
  return useQuery({
    queryKey: ['athleteProfile', user?.attributes?.email],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', '/athletes');
      const userAthlete = response.find(athlete => 
        athlete.email === user?.attributes?.email
      );
      
      if (userAthlete) {
        return userAthlete;
      }
      
      // Return default profile if not found
      return {
        athleteId: user?.attributes?.sub,
        firstName: user?.attributes?.given_name || '',
        lastName: user?.attributes?.family_name || '',
        email: user?.attributes?.email || '',
        categoryId: user?.attributes?.['custom:categoryId'] || null
      };
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
};

// Update athlete profile
export const useUpdateAthleteProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ athleteId, data }) => {
      if (athleteId) {
        return await API.put('CalisthenicsAPI', `/athletes/${athleteId}`, { body: data });
      } else {
        return await API.post('CalisthenicsAPI', '/athletes', { body: data });
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch profile
      queryClient.invalidateQueries(['athleteProfile']);
    }
  });
};

// Fetch athlete registrations
export const useAthleteRegistrations = (athleteId) => {
  return useQuery({
    queryKey: ['athleteRegistrations', athleteId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/athletes/${athleteId}/competitions`);
      return response || [];
    },
    enabled: !!athleteId,
    staleTime: 5 * 60 * 1000
  });
};

// Register for event
export const useRegisterForEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ athleteId, eventId, categoryId }) => {
      return await API.post('CalisthenicsAPI', `/athletes/${athleteId}/competitions`, {
        body: {
          eventId,
          categoryId,
          registrationDate: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['athleteRegistrations']);
    }
  });
};
