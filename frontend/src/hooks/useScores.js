import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from 'aws-amplify';

// Fetch scores for an event
export const useEventScores = (eventId) => {
  return useQuery({
    queryKey: ['eventScores', eventId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/public/scores?eventId=${eventId}`);
      return response || [];
    },
    enabled: !!eventId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 0 // Always consider stale for real-time updates
  });
};

// Fetch athlete scores
export const useAthleteScores = (athleteId, eventIds = []) => {
  return useQuery({
    queryKey: ['athleteScores', athleteId, eventIds],
    queryFn: async () => {
      let allScores = [];
      
      for (const eventId of eventIds) {
        try {
          const scores = await API.get('CalisthenicsAPI', `/public/scores?eventId=${eventId}`);
          allScores = [...allScores, ...(scores || [])];
        } catch (error) {
          console.error(`Error fetching scores for event ${eventId}:`, error);
        }
      }
      
      // Filter scores for this athlete
      return allScores.filter(score => 
        score && score.athleteId && 
        (score.athleteId === athleteId || 
         score.athleteId.includes(athleteId))
      );
    },
    enabled: !!athleteId && eventIds.length > 0,
    staleTime: 30 * 1000 // 30 seconds
  });
};

// Submit score
export const useSubmitScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scoreData) => {
      return await API.post('CalisthenicsAPI', '/scores', {
        body: scoreData
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['eventScores', variables.eventId]);
      queryClient.invalidateQueries(['athleteScores']);
    }
  });
};

// Fetch leaderboard
export const useLeaderboard = (eventId, categoryId) => {
  return useQuery({
    queryKey: ['leaderboard', eventId, categoryId],
    queryFn: async () => {
      const response = await API.get('CalisthenicsAPI', `/scores/leaderboard/${eventId}`, {
        queryStringParameters: categoryId ? { categoryId } : {}
      });
      return response?.leaderboard || [];
    },
    enabled: !!eventId,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 0
  });
};
